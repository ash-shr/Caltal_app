# Rolling back Caltal

What to do when a release breaks something. Work out which part is broken, then
use that section. The quickest fix comes first in each one; the proper fix
(a corrected release) can follow once things are working again.

| What's broken | Section |
|---|---|
| The website, or the server (the app can't load or save anything) | 1 |
| The phone app, after an `eas update` | 2 |
| The phone app, after a new build from Google Play | 3 |
| Data in the database is wrong or lost | 4 |

---

## 1. Website and server (Fly.io)

**Quickest: put the last good version back.** Fly keeps every version it has run.

```bash
fly releases -a caltal --image
```

Find the last version from before the problem, then copy its image (it looks
like `registry.fly.io/caltal:deployment-01J...`) into:

```bash
fly deploy -a caltal --image registry.fly.io/caltal:deployment-01J...
```

This uses the image that was already built, so it takes about a minute and
doesn't need GitHub or the map key.

**Proper fix:** undo the bad commit and push. CI tests it and the deploy runs
as usual.

```bash
git revert <bad commit>
git push
```

### If the bad release changed the database

Database changes (`src/main/resources/db/migration`) only ever go forwards:
going back to an older version of the server does not undo them. That's safe
as long as every migration only *adds* (new tables, new columns that may be
empty). So:

- **Only add in a migration.** To remove or rename something, stop using it in
  one release and remove it in a later one, once the older release can no
  longer be needed.
- If a migration damaged data, go to section 4.

## 2. Phone app, after an `eas update`

JavaScript-only changes reach phones through EAS Update, and can be undone the
same way:

```bash
cd mobile
npx eas-cli@latest update:rollback
```

It asks which channel (`production` for Play Store users, `preview` for test
builds) and then offers either:

- **a previous update**: phones go back to that one, or
- **the embedded update**: phones go back to the JavaScript the build shipped with.

Phones pick it up the next time the app is opened, and use it the time after.

## 3. Phone app, after a new build on Google Play

A build can't be swapped for an older one: Google Play only accepts a higher
version number. So:

1. **Stop it spreading.** Release new builds to production as a *staged
   rollout* (say 20% of users first). If one goes wrong, open
   **Play Console → Production → Releases**, and choose **Halt rollout**.
   Nobody new gets it.
2. **If the problem is in the JavaScript**, an `eas update` with the fix
   reaches the phones that already have the build (section 2 in reverse).
3. **If it's in native code** (a new library, `app.json`, the alarm module),
   fix it, make a new build, and upload it. Its version number is higher
   automatically (`autoIncrement` in `eas.json`).

## 4. Database restore

Fly takes a snapshot of the database volume every day and keeps it for the
number of days shown under RETENTION DAYS.

```bash
fly volumes list -a caltal-db-ash
fly volumes snapshots list <volume id> -a caltal-db-ash
fly image show -a caltal-db-ash
```

The last command shows the Postgres image (REPOSITORY and TAG). Restore into a
**new** database app, so the current one stays untouched until the restored
copy is checked:

```bash
fly postgres create --snapshot-id <snapshot id> --image-ref <repository>:<tag>
```

- Pick region `lhr`, and a volume at least as big as the current one.
- It prints a password once. Save it somewhere safe; never in this repo.
- Caltal's own database user and password are inside the snapshot, so they
  stay the same.

Check the data on the new database, then point the server at it. Only the
address changes (the database's name is the new app's name):

```bash
fly secrets set DB_URL="jdbc:postgresql://<new database app>.internal:5432/caltal" -a caltal
```

Keep the old database app until everything is confirmed working, then delete
it in the Fly dashboard.

If `fly postgres create` fails with "unauthorized", sign in to flyctl again
(`fly auth logout`, then `fly auth login`) and retry.

Fly's own Postgres (the kind Caltal uses) is no longer maintained by Fly and
their support can't help with it. Practise this restore once, into a test app
that you delete afterwards, before it's ever needed for real.
