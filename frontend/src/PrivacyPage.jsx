import PageLayout from './PageLayout';
import { CONTACT_EMAIL } from './config';
import { navigate } from './router';

// The privacy policy. Google Play needs one at a public web address, linked
// from the app and the store listing. Keep it true: if Caltal starts
// collecting something new or using a new service, it goes here first, and
// the date changes.
const UPDATED = '21 October 2026';

// Word for word the notice the phone app shows before asking for background
// location (mobile/src/placeReminders.js). Google wants the same words in the
// app, on the website and in the store listing.
const LOCATION_NOTICE =
  'Caltal collects location data to enable place reminders, even when the app is closed or ' +
  'not in use. It compares where you are with the places you pin tasks to, and reminds you ' +
  'when you arrive near one. Your location stays on your phone: it is not sent to ' +
  'Caltal’s server.';

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
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// "by emailing …" when a contact address is set, otherwise nothing
const byEmail = CONTACT_EMAIL ? ` by emailing ${CONTACT_EMAIL}` : '';

function PrivacyPage({ signedIn }) {
  return (
    <PageLayout title="Privacy policy" signedIn={signedIn}>
      <p className="-mt-6 text-sm text-stone-400">Last updated {UPDATED}</p>

      <Paragraph>
        This policy explains what personal data Caltal collects, why it is collected, who it is
        shared with, how long it is kept, and the rights you have over it. It applies to the
        Caltal website (caltal.app) and the Caltal phone app.
      </Paragraph>

      <section className="space-y-2">
        <Heading>1. Who we are</Heading>
        <Paragraph>
          Caltal is provided by Ashutosh Sharma, a developer based in the United Kingdom (“we”,
          “us”). We are the data controller for the personal data described in this policy, which
          means we decide how and why it is used.
          {CONTACT_EMAIL ? ` You can contact us at ${CONTACT_EMAIL}.` : ''}
        </Paragraph>
      </section>

      <section className="space-y-2 rounded-2xl bg-caltal-soft p-5">
        <Heading>Location in the background</Heading>
        <Paragraph>{LOCATION_NOTICE}</Paragraph>
        <Paragraph>
          The phone app does this only after you turn on place reminders and grant the
          permission, and you can turn it off at any time in Caltal’s Settings or your phone’s
          settings.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>2. The data we collect</Heading>
        <List
          items={[
            'Account details: your name, your email address, and whether you have confirmed it.',
            'Your password, stored only as a one-way BCrypt hash. We never store your password itself and cannot read it.',
            'If you choose to sign in with Google: your Google account ID, name and email address, as shared by Google.',
            'Tasks: their names, dates and reminder times and, for tasks with a place, its position on the map and the reminder distance.',
            'Voice notes you record on a task in the phone app, up to two minutes each.',
            'Saved places, such as Home or Work: their names, their positions and, if they came from a search, their addresses.',
            'Records of the confirmation and password reset emails sent to you, used to limit how many can be sent.',
            'Technical data: the IP address your device connects from, which our hosting provider and the services listed below necessarily receive, and which our server uses temporarily to protect sign-in from repeated attempts.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>3. How we use your data, and our lawful basis</Heading>
        <Paragraph>
          We use your data only to provide Caltal to you: to run your account, store and show your
          tasks, saved places and voice notes, remind you at the times and places you choose, and
          send the emails you need to confirm your address or reset your password. UK data
          protection law calls this processing that is necessary for a contract with you.
        </Paragraph>
        <Paragraph>
          We also process technical data such as IP addresses to keep Caltal secure, for example
          to stop passwords being guessed. This is in our legitimate interest in protecting the
          service and your account.
        </Paragraph>
        <Paragraph>
          We do not use your data for advertising, we do not sell it, and we do not make automated
          decisions about you that have legal or similarly significant effects.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>4. Location</Heading>
        <List
          items={[
            'Phone app: your location is used to show where you are on the map and to remind you when you are near a task’s place. This is worked out on your phone, as described above, and your location is not sent to our server.',
            'Website: if you choose “Watch for tasks around me”, the website sends your current position to our server to find the tasks you are near. It is used to answer that request and is not stored.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>5. Microphone and voice notes</Heading>
        <Paragraph>
          The phone app uses your microphone only while you are recording a voice note, after you
          tap to record and grant the permission. Nothing is recorded at any other time. A voice
          note is stored with its task, can be played only from your account, and is deleted when
          you remove it or delete the task.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>6. Who we share data with</Heading>
        <Paragraph>
          We share personal data only with the service providers that help us run Caltal, and only
          as far as each one needs it:
        </Paragraph>
        <List
          items={[
            'Fly.io: hosts the website, the server and the database that holds your account, tasks, voice notes and saved places. Your data is stored in its London region.',
            'MapTiler: provides the map and the place search, so it receives the area of the map you view and what you type into the search box.',
            'Resend: delivers Caltal’s emails, so it receives your email address and the content of those emails.',
            'Google: only if you choose to sign in with Google.',
            'Expo: delivers updates to the phone app, so it receives technical details such as the app version and your device’s operating system.',
          ]}
        />
        <Paragraph>
          We may also disclose data where the law requires it. We do not sell your data or share it
          with advertisers.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>7. International transfers</Heading>
        <Paragraph>
          Some of these providers are based in, or may process data in, countries outside the UK,
          including the United States. Where that happens, the transfer is protected by safeguards
          recognised under UK data protection law, such as adequacy regulations or the standard
          data protection clauses in the provider’s data processing terms.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>8. How long we keep your data</Heading>
        <List
          items={[
            'Your account, tasks, voice notes and saved places are kept until you delete them or your account.',
            'When you delete your account, everything in it is removed from our database straight away. The database’s automatic backups are replaced over the following few days, after which no copy remains.',
            'Records of the links we email you are removed after the links expire, once they are no longer needed to limit how many emails are sent.',
            'IP addresses used to protect sign-in are held only temporarily in the server’s memory and are never written to the database.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>9. How we protect your data</Heading>
        <Paragraph>
          All connections to Caltal are encrypted (HTTPS). Passwords are stored only as hashes.
          Your tasks, saved places and voice notes can be reached only by signing in to your
          account. On your phone, your sign-in is kept in the phone’s secure storage. No method of
          storing or sending data is completely secure, but we take reasonable steps to protect
          yours.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>10. Storage on your device</Heading>
        <Paragraph>
          The website keeps your sign-in and your default reminder distance in your browser’s
          local storage. The phone app keeps your sign-in in secure storage, and its settings and
          the list of places it is watching on the phone. Caltal does not use cookies, advertising
          identifiers, analytics or tracking tools.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>11. Your rights</Heading>
        <Paragraph>
          Under UK data protection law you have the right to access the personal data we hold about
          you, to have it corrected, to have it deleted, to restrict or object to how it is used,
          and to receive a copy of it in a portable format. You can change your name and password
          in Settings, and delete your account and everything in it at any time:{' '}
          <button
            type="button"
            onClick={() => navigate('/delete-account')}
            className="font-medium text-caltal hover:underline"
          >
            how to delete your account
          </button>
          . To exercise any other right, contact us{byEmail}. We will respond within one month.
        </Paragraph>
        <Paragraph>
          If you are unhappy with how your data is handled, please contact us first. You also have
          the right to complain to the Information Commissioner’s Office (ico.org.uk), the UK’s
          data protection regulator.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>12. Children</Heading>
        <Paragraph>
          Caltal is not intended for children under 13, and we do not knowingly collect personal
          data from them. If you believe a child under 13 has created an account, contact us
          {byEmail} and we will delete it.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>13. Changes to this policy</Heading>
        <Paragraph>
          We may update this policy from time to time. The date at the top shows when it last
          changed. If we make a significant change, we will let you know in Caltal before it takes
          effect.
        </Paragraph>
      </section>

      {CONTACT_EMAIL && (
        <section className="space-y-2">
          <Heading>14. Contact</Heading>
          <Paragraph>
            Questions about this policy or your data can be sent to {CONTACT_EMAIL}.
          </Paragraph>
        </section>
      )}
    </PageLayout>
  );
}

export default PrivacyPage;
