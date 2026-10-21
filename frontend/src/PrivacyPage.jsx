import PageLayout from './PageLayout';
import { CONTACT_EMAIL } from './config';
import { navigate } from './router';

// The privacy policy, in plain English. Google Play needs one at a public web
// address, linked from the app and the store listing. Keep it true: if
// Caltal starts collecting something new or using a new service, it goes here
// first.
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

function PrivacyPage({ signedIn }) {
  return (
    <PageLayout title="Privacy policy" signedIn={signedIn}>
      <p className="-mt-6 text-sm text-stone-400">Last updated {UPDATED}</p>

      <section className="space-y-2">
        <Heading>Who we are</Heading>
        <Paragraph>
          Caltal is a task app that reminds you at a time, at a place, or both. It is made and run
          by Ashutosh Sharma, an individual developer in the UK, and is available as a website
          (caltal.fly.dev) and a phone app. This policy covers both.
        </Paragraph>
      </section>

      <section className="space-y-2 rounded-2xl bg-caltal-soft p-5">
        <Heading>Location in the background</Heading>
        <Paragraph>{LOCATION_NOTICE}</Paragraph>
        <Paragraph>
          The phone app only does this after you turn on place reminders and allow it, and you
          can turn it off at any time in Settings.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>What Caltal stores about you</Heading>
        <List
          items={[
            'Your account: your name, your email address, and whether you have confirmed it.',
            'Your password, as a scrambled one-way code (a BCrypt hash). Caltal never stores the password itself and cannot read it.',
            'If you sign in with Google: your Google account’s ID, name and email address, which Google shares with Caltal when you choose to sign in that way.',
            'Your tasks: their names, dates and reminder times, and for tasks with a place, the place on the map and the reminder distance.',
            'Voice notes you record on a task in the phone app (up to two minutes each). The recording is stored with the task, only you can play it, and it is deleted when you remove it or delete the task.',
            'Your saved places (like Home or Work): their names, where they are, and the address if they came from a search.',
            'Records of the confirmation and password reset emails sent to you, kept only as long as needed to stop too many being sent.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>Your microphone</Heading>
        <Paragraph>
          The phone app uses the microphone only while you are recording a voice note, after you
          tap to record and allow it. Nothing is recorded at any other time.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>Your location</Heading>
        <List
          items={[
            'Phone app: to show where you are on the map and to remind you near a task’s place. This happens on your phone, as described above, and your location is not sent to Caltal’s server.',
            'Website: when you choose “Watch for tasks around me”, the website sends your current position to Caltal’s server to find the tasks you are near. It is used for that answer and not stored.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>What Caltal doesn’t do</Heading>
        <List
          items={[
            'No adverts, and no advertising or tracking cookies.',
            'No analytics or tracking tools.',
            'Your data is never sold, and only shared with the services below, for the reasons given.',
          ]}
        />
      </section>

      <section className="space-y-2">
        <Heading>Services Caltal relies on</Heading>
        <List
          items={[
            'Fly.io hosts the website, the server and the database where your account, tasks, voice notes and saved places are kept.',
            'MapTiler provides the map and the place search. It receives the area of the map you look at and what you type into search.',
            'Resend sends Caltal’s emails, so it receives your email address and the email’s content.',
            'Google, only if you choose to sign in with Google.',
            'Expo delivers updates to the phone app, so it sees which version of the app your phone has.',
          ]}
        />
        <Paragraph>
          Like any website or app, these services see the internet address (IP address) your
          phone or computer connects from.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>Storage on your device</Heading>
        <Paragraph>
          The website keeps your sign-in and one setting (the default reminder distance) in your
          browser’s storage. The phone app keeps your sign-in in the phone’s secure storage, and
          its settings and the list of places it is watching on the phone. None of this is used to
          track you.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>How long it’s kept</Heading>
        <Paragraph>
          Your account, tasks, voice notes and saved places are kept until you delete them or your
          account.
          Deleting your account removes all of it from Caltal’s database straight away. The
          database’s automatic backups are replaced over the following few days, after which
          nothing is left.
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>Your rights</Heading>
        <Paragraph>
          You can see and change your name and password in Settings, and delete your account and
          everything in it at any time.{' '}
          <button
            type="button"
            onClick={() => navigate('/delete-account')}
            className="font-medium text-caltal hover:underline"
          >
            How to delete your account
          </button>
          . Under UK data protection law you can also ask for a copy of your data, or for it to be
          corrected or deleted
          {CONTACT_EMAIL ? `, by emailing ${CONTACT_EMAIL}` : ''}. If you are unhappy with how your
          data is handled, you can complain to the Information Commissioner’s Office (ico.org.uk).
        </Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>Children</Heading>
        <Paragraph>Caltal isn’t meant for children under 13.</Paragraph>
      </section>

      <section className="space-y-2">
        <Heading>Changes</Heading>
        <Paragraph>
          If this policy changes, the date at the top changes with it.
          {CONTACT_EMAIL ? ` Questions are welcome at ${CONTACT_EMAIL}.` : ''}
        </Paragraph>
      </section>
    </PageLayout>
  );
}

export default PrivacyPage;
