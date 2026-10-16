import PageLayout from './PageLayout';

// Basic placeholder terms in plain English: the same words as the phone
// app's Terms screen (mobile/src/app/(app)/terms.js), so change both together.
// Before Caltal goes on the App Store or Google Play, these need replacing
// with properly written terms and a privacy policy.
const UPDATED = '16 October 2026';

const SECTIONS = [
  {
    heading: 'About Caltal',
    body:
      'Caltal is a personal project that reminds you about tasks at a time, at a place, or both. ' +
      'It is still being built, and it is provided as it is, without any guarantee that it will ' +
      'always work or always be available.',
  },
  {
    heading: 'Your account',
    body:
      'You need an account to use Caltal. Please give a real email address and keep your password ' +
      'to yourself. You are responsible for what happens on your account. One account is for one person. ' +
      'Caltal only emails you about your account: to confirm your address, and to reset your password ' +
      'when you ask. These emails are sent through Resend, an email delivery service.',
  },
  {
    heading: 'Your tasks and your location',
    body:
      'Caltal stores the tasks you create, including their names, dates, times and any places you pin ' +
      'on the map. Your phone or browser checks your location itself to know when you reach one of ' +
      'those places. Your live location is not sent to or stored on Caltal’s server. The map and ' +
      'the place search come from MapTiler, which sees the part of the map you look at and what ' +
      'you search for.',
  },
  {
    heading: 'Reminders are not guaranteed',
    body:
      'Phones limit what apps can do in the background, and the website can only remind you while it ' +
      'is open, so a reminder can arrive late or not at all: for example with low battery, no signal, ' +
      'or location turned off. Please don’t rely on Caltal for anything urgent, medical or safety-related.',
  },
  {
    heading: 'Using Caltal fairly',
    body:
      'Don’t use Caltal to break the law, to harm anyone, or to try to get into accounts or data ' +
      'that aren’t yours. Accounts used this way may be removed.',
  },
  {
    heading: 'Deleting your account',
    body:
      'You can delete your account at any time in Settings. This permanently removes your account and ' +
      'all of your tasks from Caltal’s server.',
  },
  {
    heading: 'Changes to these terms',
    body: 'These terms may change as Caltal grows. The date at the top shows when they last changed.',
  },
  {
    heading: 'Questions',
    body: 'Caltal’s code is open at github.com/ash-shr/Caltal_app, where you can raise an issue.',
  },
];

function TermsPage() {
  return (
    <PageLayout title="Terms">
      <p className="-mt-6 text-sm text-stone-400">Last updated {UPDATED}</p>

      {SECTIONS.map((section, index) => (
        <section key={section.heading} className="space-y-1.5">
          <h2 className="font-semibold text-stone-800">
            {index + 1}. {section.heading}
          </h2>
          <p className="text-[15px] leading-relaxed text-stone-600">{section.body}</p>
        </section>
      ))}
    </PageLayout>
  );
}

export default TermsPage;
