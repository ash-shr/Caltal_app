import { useEffect, useRef, useState } from 'react';
import { confirmEmail } from './api';
import Auth from './Auth';
import { forgetLinkToken, tokenFromLink } from './links';
import LinkPage from './LinkPage';
import { buttonClass, secondaryButtonClass } from './ui';

// Opened from the "Confirm your email" email.
//
// The link only counts for someone signed in to the account it was sent to,
// so this asks them to sign in first if they aren't. (The reason is in
// AccountEmailService.confirmEmail on the server.)
function VerifyEmail({ user, onAuthenticated, onSignOut }) {
  const [token] = useState(tokenFromLink);

  if (!token) {
    return (
      <LinkPage title="This link is incomplete">
        <p className="text-center text-sm text-stone-500">
          Copy the whole link from the email into your browser.
        </p>
      </LinkPage>
    );
  }

  if (!user) {
    return (
      <Auth
        onAuthenticated={onAuthenticated}
        notice="Sign in to confirm your email address."
      />
    );
  }

  return <Confirm token={token} user={user} onSignOut={onSignOut} />;
}

function Confirm({ token, user, onSignOut }) {
  const [result, setResult] = useState({ status: 'working', message: '' });

  // Send the link once. In development React runs effects twice on purpose;
  // a second send would find the link already used and show an error.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    confirmEmail(token)
      .then(() => {
        forgetLinkToken();
        setResult({ status: 'done', message: '' });
      })
      .catch(err => setResult({ status: 'failed', message: err.message }));
  }, [token]);

  const openCaltal = () => window.location.replace('/');

  if (result.status === 'working') {
    return (
      <LinkPage title="Confirming your email…">
        <p className="text-center text-sm text-stone-500">One moment.</p>
      </LinkPage>
    );
  }

  if (result.status === 'done') {
    return (
      <LinkPage title="Email confirmed">
        <p className="mb-6 text-center text-sm text-stone-500">
          {`${user.email} is confirmed. Thanks!`}
        </p>
        <button type="button" onClick={openCaltal} className={buttonClass}>
          Open Caltal
        </button>
      </LinkPage>
    );
  }

  return (
    <LinkPage title="That didn't work">
      <p className="mb-2 text-center text-sm text-red-600">{result.message}</p>
      <p className="mb-6 text-center text-sm text-stone-500">
        {`Signed in as ${user.email}. You can send a new link from the menu `
          + 'under your initials, or from Settings in the phone app.'}
      </p>
      <div className="space-y-2">
        <button type="button" onClick={openCaltal} className={buttonClass}>
          Open Caltal
        </button>
        <button type="button" onClick={onSignOut} className={secondaryButtonClass}>
          Sign out
        </button>
      </div>
    </LinkPage>
  );
}

export default VerifyEmail;
