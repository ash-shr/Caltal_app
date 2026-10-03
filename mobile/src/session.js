import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStoredUser, logout, setSessionExpiredHandler } from './api';
import { clearAllReminders } from './reminders';

// Long enough for the peeling-orange animation to play once at start-up.
const SPLASH_MS = 1400;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Who is signed in, shared with every screen. The root layout uses `user` to
// decide which screens exist at all (see Stack.Protected in app/_layout.js).
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    Promise.all([getStoredUser(), wait(SPLASH_MS)])
      .then(([stored]) => setUser(stored))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  // If the server says the session is over (a 401), go back to sign-in.
  // Reminders belong to the account, so they go too.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAllReminders();
      setUser(null);
    });
  }, []);

  const signOut = useCallback(async () => {
    // Back to sign-in straight away; the tidying up happens behind it.
    setUser(null);
    // Reminders belong to this account; don't leave them firing for the next.
    await clearAllReminders();
    await logout();
  }, []);

  return (
    <SessionContext.Provider value={{ user, setUser, booting, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
