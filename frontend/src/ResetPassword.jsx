import { useState } from 'react';
import { resetPassword } from './api';
import { forgetLinkToken, tokenFromLink } from './links';
import LinkPage from './LinkPage';
import { buttonClass, inputClass, linkButtonClass } from './ui';

// Opened from the "Reset your Caltal password" email.
function ResetPassword() {
  const [token] = useState(tokenFromLink);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  // Set when the server turned the link down, so offering a new one makes sense
  const [linkRefused, setLinkRefused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLinkRefused(false);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== repeat) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password);
      forgetLinkToken();
      setDone(true);
    } catch (err) {
      setError(err.message);
      setLinkRefused(true);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <LinkPage title="This link is incomplete">
        <p className="text-center text-sm text-stone-500">
          {'Copy the whole link from the email, or '}
          <a href="/#forgot" className={linkButtonClass}>ask for a new one</a>.
        </p>
      </LinkPage>
    );
  }

  if (done) {
    return (
      <LinkPage title="Password changed">
        <p className="mb-6 text-center text-sm leading-relaxed text-stone-500">
          {"You're signed in on this browser, and signed out everywhere else. "
            + 'On the phone app, sign in with your new password.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.replace('/')}
          className={buttonClass}
        >
          Open Caltal
        </button>
      </LinkPage>
    );
  }

  return (
    <LinkPage title="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="New password"
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          autoFocus
        />

        <input
          className={inputClass}
          type="password"
          value={repeat}
          onChange={e => setRepeat(e.target.value)}
          placeholder="New password again"
          maxLength={72}
          autoComplete="new-password"
        />

        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-center text-sm">
          <p className="text-red-600">{error}</p>
          {linkRefused && (
            <a href="/#forgot" className={`mt-2 inline-block ${linkButtonClass}`}>
              Ask for a new link
            </a>
          )}
        </div>
      )}
    </LinkPage>
  );
}

export default ResetPassword;
