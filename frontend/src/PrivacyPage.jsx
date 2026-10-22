import PageLayout from './PageLayout';
import { CONTACT_EMAIL } from './config';
import { navigate } from './router';

// The privacy policy. Google Play needs one at a public web address, linked
// from the app and the store listing. Keep it true: if Caltal starts
// collecting something new or using a new service, it goes here first, and
// the date changes. Written to cover UK data protection law (UK GDPR and the
// Data Protection Act 2018), but not reviewed by a lawyer.
const UPDATED = '22 October 2026';

// Word for word the notice the phone app shows before asking for background
// location (mobile/src/placeReminders.js). Google wants the same words in the
// app, on the website and in the store listing.
const LOCATION_NOTICE =
  'Caltal collects location data to enable place reminders, even when the app is closed or ' +
  'not in use. It compares where you are with the places you pin tasks to, and reminds you ' +
  'when you arrive near one. Your location stays on your phone: it is not sent to ' +
  'Caltal’s server.';

const EMAIL = CONTACT_EMAIL || 'the address on the Caltal website';

function Heading({ children }) {
  return <h2 className="font-semibold text-stone-800">{children}</h2>;
}

function Paragraph({ children }) {
  return <p className="text-[15px] leading-relaxed text-stone-600">{children}</p>;
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-stone-600">
      {items.map(item => (
        <li key={typeof item === 'string' ? item : item.key}>{item}</li>
      ))}
    </ul>
  );
}

// A table on wider screens. On a phone, where three columns would be cramped,
// each row becomes a small card instead: its first cell as the title, and the
// other cells under their column names.
function Table({ head, rows }) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {rows.map(row => (
          <div key={row[0]} className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
            <p className="text-[15px] font-semibold text-stone-800">{row[0]}</p>
            {row.slice(1).map((cell, index) => (
              <div key={head[index + 1]} className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  {head[index + 1]}
                </p>
                <p className="text-[14px] leading-snug text-stone-600">{cell}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <WideTable head={head} rows={rows} />
    </>
  );
}

function WideTable({ head, rows }) {
  return (
    <div className="hidden sm:block">
      <table className="w-full border-collapse text-left text-[14px] leading-snug">
        <thead>
          <tr>
            {head.map(cell => (
              <th
                key={cell}
                className="border-b border-stone-300 py-2 pr-4 align-bottom font-semibold text-stone-800"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td
                  key={index}
                  className="border-b border-stone-200 py-2.5 pr-4 align-top text-stone-600"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <Heading>{title}</Heading>
      {children}
    </section>
  );
}

function PrivacyPage({ signedIn }) {
  return (
    <PageLayout title="Privacy policy" signedIn={signedIn}>
      <p className="-mt-6 text-sm text-stone-400">Last updated {UPDATED}</p>

      <Paragraph>
        This privacy policy explains how Caltal (“Caltal”, “we”, “us” or “our”) collects, uses,
        shares and protects personal data when you use the Caltal mobile app and the Caltal
        website at caltal.app (together, the “Service”). It also explains the rights you have
        and how to use them. Please read it together with our{' '}
        <button
          type="button"
          onClick={() => navigate('/terms')}
          className="font-medium text-caltal hover:underline"
        >
          terms of use
        </button>
        .
      </Paragraph>

      <section className="space-y-2 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
        <Heading>Privacy at a glance</Heading>
        <List
          items={[
            'We collect only what the Service needs: your account, your tasks, the places you save and any voice notes you record.',
            'Your live location is used on your phone to trigger place reminders. It is not sent to our server.',
            'We do not show adverts, use analytics or tracking tools, or sell your data.',
            'You can delete your account, and everything in it, at any time.',
          ]}
        />
      </section>

      <Section title="1. Who we are">
        <Paragraph>
          The Service is provided by Ashutosh Sharma, a developer based in the United Kingdom.
          For the purposes of the UK General Data Protection Regulation (UK GDPR) and the Data
          Protection Act 2018, we are the controller of the personal data described in this
          policy. You can contact us about this policy or your data at {EMAIL}.
        </Paragraph>
      </Section>

      <section className="space-y-2 rounded-2xl bg-caltal-soft p-5">
        <Heading>Location in the background</Heading>
        <Paragraph>{LOCATION_NOTICE}</Paragraph>
        <Paragraph>
          The phone app does this only after you turn on place reminders and grant the
          permission, and you can turn it off at any time in Caltal’s Settings or your phone’s
          settings.
        </Paragraph>
      </section>

      <Section title="2. Personal data we collect">
        <Table
          head={['Category', 'What it includes', 'Where it comes from']}
          rows={[
            [
              'Account details',
              'Your name, email address and whether you have confirmed it. Your password, stored only as a one-way BCrypt hash, never in readable form.',
              'You, when you register',
            ],
            [
              'Google sign-in details',
              'Your Google account identifier, name and email address.',
              'Google, only if you choose to sign in with Google',
            ],
            [
              'Tasks',
              'Task names, dates, reminder times, whether each task is done and, for tasks with a place, its position on the map and the reminder distance.',
              'You',
            ],
            [
              'Saved places',
              'The names you give places (such as Home or Work), their positions and, if they came from a search, their addresses.',
              'You',
            ],
            [
              'Voice notes',
              'Audio recordings of up to two minutes that you attach to tasks in the phone app.',
              'You',
            ],
            [
              'Location',
              'Your device’s location. In the phone app it is processed on your device and not received by us. On the website, it is sent to us only when you use “Watch for tasks around me”.',
              'Your device, with your permission',
            ],
            [
              'Place searches',
              'The text you type into the place search, and the area of the map you are viewing.',
              'You',
            ],
            [
              'Technical data',
              'Your IP address and basic technical information sent with every internet request, such as the app version.',
              'Your device, automatically',
            ],
            ['Messages', 'Anything you write when you contact us.', 'You'],
          ]}
        />
      </Section>

      <Section title="3. How we use your data, and our lawful bases">
        <Paragraph>
          UK data protection law requires a lawful basis for each use of personal data. Ours are:
        </Paragraph>
        <Table
          head={['Purpose', 'Data used', 'Lawful basis']}
          rows={[
            [
              'Providing the Service: your account, storing and showing your tasks, saved places and voice notes, and keeping the app and website in step',
              'Account details, tasks, saved places, voice notes',
              'Performance of our contract with you',
            ],
            [
              'Reminding you at the times and places you choose',
              'Tasks, location (on your device)',
              'Performance of our contract with you',
            ],
            [
              'Showing maps and finding places you search for',
              'Place searches, map area',
              'Performance of our contract with you',
            ],
            [
              'Sending the emails your account needs, such as confirming your address and resetting your password',
              'Name, email address',
              'Performance of our contract with you',
            ],
            [
              'Keeping the Service secure, for example limiting repeated sign-in attempts',
              'IP address, account details',
              'Our legitimate interest in protecting the Service and your account',
            ],
            [
              'Answering your questions and requests',
              'Messages, account details',
              'Our legitimate interest in helping you, or our legal obligations',
            ],
            [
              'Meeting our legal obligations',
              'Any of the above, where required',
              'Legal obligation',
            ],
          ]}
        />
        <Paragraph>
          We do not use your data for advertising or profiling, we do not sell it, and we do not
          make decisions about you by automated means that have legal or similarly significant
          effects.
        </Paragraph>
      </Section>

      <Section title="4. Location">
        <List
          items={[
            'Phone app: your location is used to show where you are on the map and, if you turn on place reminders, to remind you when you are near a task’s place. Your phone compares its own location with your tasks’ places. Your location is not sent to our server.',
            'Website: if you choose “Watch for tasks around me”, the website sends your current position to our server to find the tasks you are near. It is used to answer that request and is not stored.',
            'The places you pin tasks to and the places you save are stored on our server, because they are part of your tasks.',
          ]}
        />
      </Section>

      <Section title="5. Microphone and voice notes">
        <Paragraph>
          The phone app uses your microphone only while you are recording a voice note, after you
          tap to record and grant the permission. Nothing is recorded at any other time. A voice
          note is stored with its task, can be played only from your account, and is deleted when
          you remove it or delete the task.
        </Paragraph>
      </Section>

      <Section title="6. Who we share your data with">
        <Paragraph>
          We share personal data only with the service providers below, who process it on our
          behalf and under our instructions, and only as far as each one needs it to provide its
          service:
        </Paragraph>
        <Table
          head={['Provider', 'What it does for Caltal', 'Where']}
          rows={[
            [
              'Fly.io',
              'Hosts the website, the server and the database that holds your account, tasks, saved places and voice notes.',
              'Data stored in London, UK. Fly.io is a US company.',
            ],
            [
              'MapTiler',
              'Provides the maps and the place search. It receives the map area you view and what you type into the search.',
              'Switzerland',
            ],
            [
              'Resend',
              'Delivers Caltal’s emails. It receives your email address and the content of those emails.',
              'Sending from Ireland. Resend is a US company.',
            ],
            [
              'Google',
              'Verifies your identity if you choose to sign in with Google.',
              'United States',
            ],
            [
              'Expo',
              'Delivers updates to the phone app. It receives technical details such as the app version and your phone’s operating system.',
              'United States',
            ],
          ]}
        />
        <Paragraph>
          We may also disclose personal data where we are required to by law, to protect the
          rights, safety or property of our users or others, or as part of a transfer of the
          Service to a new owner, who would be bound by this policy. We do not sell your data or
          share it with advertisers.
        </Paragraph>
      </Section>

      <Section title="7. International transfers">
        <Paragraph>
          Some of our providers are based in, or may process data in, countries outside the UK,
          including the United States. Where personal data is transferred outside the UK, we rely
          on safeguards recognised by UK data protection law, such as adequacy regulations or the
          standard data protection clauses in each provider’s data processing terms.
        </Paragraph>
      </Section>

      <Section title="8. How long we keep your data">
        <Table
          head={['Data', 'How long we keep it']}
          rows={[
            [
              'Account details, tasks, saved places and voice notes',
              'Until you delete them, or until you delete your account.',
            ],
            [
              'Data in database backups',
              'Our database is backed up automatically each day. Backups are deleted after a few days, so after you delete your account, no copy remains once the last backup containing it has been deleted.',
            ],
            [
              'Records of emailed links (confirmation and password reset)',
              'Removed after the link expires, once no longer needed to limit how many emails are sent.',
            ],
            [
              'IP addresses used to protect sign-in',
              'Held only briefly in the server’s memory, and never written to the database.',
            ],
            ['Messages you send us', 'As long as needed to deal with them.'],
          ]}
        />
      </Section>

      <Section title="9. How we protect your data">
        <Paragraph>
          All connections to the Service are encrypted (HTTPS), and our database is encrypted at
          rest. Passwords are stored only as hashes. Your tasks, saved places and voice notes can
          only be reached by signing in to your account, and requests are limited to stop them
          being guessed or misused. On your phone, your sign-in is kept in the phone’s secure
          storage. No method of storing or transmitting data is completely secure, but we take
          appropriate technical and organisational measures to protect yours.
        </Paragraph>
      </Section>

      <Section title="10. Your rights">
        <Paragraph>Under UK data protection law you have the right to:</Paragraph>
        <List
          items={[
            'access the personal data we hold about you and receive a copy of it;',
            'have inaccurate data corrected;',
            'have your data deleted;',
            'restrict how we use your data, or object to our use of it where we rely on legitimate interests;',
            'receive the data you gave us in a commonly used, machine-readable format, and have it sent to another provider (data portability);',
            'withdraw a permission you have given, such as location or microphone access, at any time in your phone’s settings.',
          ]}
        />
        <Paragraph>
          You can change your name and password in Settings, and delete your account and
          everything in it at any time (
          <button
            type="button"
            onClick={() => navigate('/delete-account')}
            className="font-medium text-caltal hover:underline"
          >
            how to delete your account
          </button>
          ). To use any other right, email {EMAIL}. We will reply within one month, and may need to
          confirm it is your account before acting on the request.
        </Paragraph>
      </Section>

      <Section title="11. Your choices">
        <List
          items={[
            'Location, microphone and notifications are each controlled by a permission on your phone, which you can turn off at any time. Caltal keeps working without them; only the features that need them stop.',
            'Place reminders and time reminders can each be turned off in Caltal’s Settings.',
            'You can remove a voice note, a saved place or a task at any time.',
          ]}
        />
      </Section>

      <Section title="12. Cookies and storage on your device">
        <Paragraph>
          Caltal does not use cookies, advertising identifiers, analytics or tracking tools. The
          website keeps your sign-in and your default reminder distance in your browser’s local
          storage, so you stay signed in. The phone app keeps your sign-in in the phone’s secure
          storage, and its settings and the list of places it is watching on the phone. This is
          strictly necessary for the Service to work, and none of it is used to track you.
        </Paragraph>
      </Section>

      <Section title="13. Children">
        <Paragraph>
          The Service is not intended for children under 13, and we do not knowingly collect
          personal data from them. If you believe a child under 13 has created an account, please
          contact us at {EMAIL} and we will delete it.
        </Paragraph>
      </Section>

      <Section title="14. Other websites and services">
        <Paragraph>
          The Service links to, and uses, services run by others, such as Google sign-in and the
          map credits for MapTiler and OpenStreetMap. Their own privacy policies apply to what
          they do with your data.
        </Paragraph>
      </Section>

      <Section title="15. Changes to this policy">
        <Paragraph>
          We may update this policy from time to time. The date at the top shows when it last
          changed. If we make a significant change, we will let you know in the Service before it
          takes effect.
        </Paragraph>
      </Section>

      <Section title="16. Contact and complaints">
        <Paragraph>
          Questions about this policy or your personal data can be sent to {EMAIL}. If you are
          unhappy with how we have handled your data, please contact us first so we can try to put
          it right. You also have the right to complain to the Information Commissioner’s Office,
          the UK’s data protection regulator, at ico.org.uk or on 0303 123 1113.
        </Paragraph>
      </Section>
    </PageLayout>
  );
}

export default PrivacyPage;
