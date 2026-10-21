import { useState } from 'react';
import { login, register, loginWithGoogle, requestPasswordReset } from './api';
import Splash from './Splash';
import GoogleButton from './GoogleButton';
import { navigate } from './router';
import { buttonClass, inputClass, linkButtonClass } from './ui';

// notice: a line shown above the form, saying why sign-in is needed here
function Auth({ onAuthenticated, notice }) {
  // "/#forgot" opens straight on "Forgot password" (a dead reset link sends
  // people here)
  const [mode, setMode] = useState(() =>
    window.location.hash === '#forgot' ? 'forgot' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The address a reset link was asked for, once it has been
  const [resetSentTo, setResetSentTo] = useState('');

  const isRegistering = mode === 'register';
  const isForgot = mode === 'forgot';

  const switchTo = (next) => {
    setMode(next);
    setError('');
    setResetSentTo('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const result = isRegistering
        ? await register(email, password, name)
        : await login(email, password);

      onAuthenticated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await requestPasswordReset(email);
      setResetSentTo(email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError('');
    setBusy(true);

    try {
      onAuthenticated(await loginWithGoogle(credential));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      {/* Asking for a reset link is quick and signs nobody in, so it just
          shows "Sending…" on its button instead */}
      <Splash label="Signing you in…" visible={busy && !isForgot} />

      <div className="w-full max-w-sm">

        <div className="mb-10 text-center">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto mb-5 h-24 w-24"
            draggable="false"
          />
          <h1 className="text-2xl font-medium tracking-tight text-stone-800">Caltal</h1>
          <p className="mt-1 text-sm text-stone-500">Tasks that find you</p>
        </div>

        {notice && (
          <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
            {notice}
          </p>
        )}

        {isForgot ? (
          resetSentTo ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-600">
              <p className="mb-1 font-medium text-stone-800">Check your email</p>
              {`If there's a Caltal account for ${resetSentTo}, a link to choose a new `
                + 'password is on its way. It works for one hour. Check your spam folder '
                + "if it hasn't arrived in a few minutes."}
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-3">
              <p className="text-sm leading-relaxed text-stone-500">
                {"Enter your account's email address and we'll send you a link to "
                  + 'choose a new password.'}
              </p>

              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                maxLength={254}
                autoComplete="email"
                autoFocus
              />

              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )
        ) : (
          <>
            <GoogleButton onCredential={handleGoogle} onError={setError} />

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
                <span className="h-px flex-1 bg-stone-200" />
                or with email
                <span className="h-px flex-1 bg-stone-200" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegistering && (
                <input
                  className={inputClass}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  autoComplete="name"
                />
              )}

              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                maxLength={254}
                autoComplete="email"
              />

              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                minLength={isRegistering ? 8 : undefined}
                maxLength={72}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
              />

              {!isRegistering && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchTo('forgot')}
                    className="text-xs text-stone-500 underline-offset-2 transition-colors
                               hover:text-stone-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
              </button>
            </form>
          </>
        )}

        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}

        {isForgot ? (
          <p className="mt-8 text-center text-sm">
            <button type="button" onClick={() => switchTo('login')} className={linkButtonClass}>
              Back to sign in
            </button>
          </p>
        ) : (
          <p className="mt-8 text-center text-sm text-stone-500">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => switchTo(isRegistering ? 'login' : 'register')}
              className={linkButtonClass}
            >
              {isRegistering ? 'Sign in' : 'Create one'}
            </button>
          </p>
        )}

        <p className="mt-10 flex justify-center gap-4 text-xs text-stone-400">
          {[
            ['/terms', 'Terms'],
            ['/privacy', 'Privacy'],
            ['/delete-account', 'Delete an account'],
          ].map(([path, label]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="transition-colors hover:text-stone-700"
            >
              {label}
            </button>
          ))}
        </p>
      </div>
    </div>
  );
}

export default Auth;