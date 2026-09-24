import { useState } from 'react';
import { login, register } from './api';

function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegistering = mode === 'register';

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

  const inputClass =
    'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm ' +
    'text-stone-800 placeholder:text-stone-400 transition-colors duration-200 ' +
    'focus:border-stone-400 focus:outline-none';

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">

        <div className="mb-10 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-stone-800">Caltal</h1>
          <p className="mt-1 text-sm text-stone-500">Tasks that find you</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegistering && (
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          )}

          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />

          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white
                       transition-all duration-200 hover:bg-stone-700 active:scale-[0.98]
                       disabled:opacity-50"
          >
            {busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-8 text-center text-sm text-stone-500">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setMode(isRegistering ? 'login' : 'register');
              setError('');
            }}
            className="text-stone-800 underline underline-offset-2 transition-colors hover:text-stone-600"
          >
            {isRegistering ? 'Sign in' : 'Create one'}
          </button>
        </p>

      </div>
    </div>
  );
}

export default Auth;