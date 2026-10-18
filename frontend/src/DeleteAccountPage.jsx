import PageLayout from './PageLayout';
import { CONTACT_EMAIL } from './config';
import { navigate } from './router';
import { buttonClass } from './ui';

// Google Play requires every app with accounts to have a public web page that
// explains how to delete one, for people who have already uninstalled the
// app. Readable without signing in.
function DeleteAccountPage({ signedIn }) {
  const steps = [
    'In the phone app: tap your initials at the top right, then Settings, then Delete account.',
    'On this website: sign in, open Settings from the menu under your initials, then Delete account.',
    'Forgotten your password? Choose “Forgot password?” on the sign-in page to set a new one, then delete. If you signed up with Google, sign in with Google instead.',
  ];

  return (
    <PageLayout title="Delete your Caltal account" signedIn={signedIn}>
      <p className="-mt-4 text-[15px] leading-relaxed text-stone-600">
        Deleting your account removes it, with all of your tasks and saved places, from
        Caltal’s server straight away. It can’t be undone. Uninstalling the app on its own
        doesn’t delete your account.
      </p>

      <section className="space-y-3">
        <h2 className="font-semibold text-stone-800">How to delete it</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-stone-600">
          {steps.map(step => (
            <li key={step}>{step}</li>
          ))}
          {CONTACT_EMAIL && (
            <li>
              {`Can’t get into your email either? Email ${CONTACT_EMAIL} from another address and say which account it is. You’ll be asked to show it’s yours before anything is deleted.`}
            </li>
          )}
        </ol>

        <button type="button" onClick={() => navigate('/settings')} className={buttonClass}>
          {signedIn ? 'Go to Settings' : 'Sign in to delete your account'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-stone-800">What’s deleted</h2>
        <p className="text-[15px] leading-relaxed text-stone-600">
          Everything: your name, email address, password, tasks, saved places, and the records
          of emails sent to you. Nothing is kept, apart from the database’s automatic backups,
          which are replaced within a few days.
        </p>
      </section>
    </PageLayout>
  );
}

export default DeleteAccountPage;
