import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getStoredUser, logout, refreshSession, setSessionExpiredHandler } from './api';
import { clearAllReminders } from './reminders';

// Long enough for the peeling-orange animation to play once at start-up.
const SPLASH_MS = 1400;

// The longest the splash waits for the home screen to load its tasks. On a
// slow connection the map with no tasks yet is better than waiting on.
const HOME_WAIT_MS = 5000;

// How often the sign-in is renewed while Caltal is in use: at most twice a
// day, when it's opened or comes back to the front.
const REFRESH_EVERY_MS = 12 * 60 * 60 * 1000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Who is signed in, shared with every screen. The root layout uses `user` to
// decide which screens exist at all (see Stack.Protected in app/_layout.js).
//
// The splash is shown by the root layout, over every screen, while `booting`
// or `waiting` is true. Showing it there rather than inside the sign-in
// screen keeps it full screen while sign-in is swapped for the map beneath it.
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  // Signing in, or signed in and waiting for the home screen to be ready
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    Promise.all([getStoredUser(), wait(SPLASH_MS)])
      .then(([stored]) => {
        setUser(stored);
        // Already signed in: keep the splash until the tasks are on screen
        setWaiting(stored !== null);
      })
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  // `request` is the call to the server (sign in or sign up). The splash goes
  // up straight away and stays until the home screen calls homeReady().
  const signIn = useCallback(async request => {
    setWaiting(true);
    try {
      const result = await request();
      setUser({ name: result.name, email: result.email });
    } catch (failure) {
      setWaiting(false);
      throw failure;
    }
  }, []);

  const homeReady = useCallback(() => setWaiting(false), []);

  // Keeps the sign-in from running out. A session ending used to mean being
  // signed out after a day, and every reminder on the phone cancelled with it.
  // Now the token is swapped for a fresh 30-day one each time Caltal is
  // opened (at most twice a day). Offline, it simply tries again next time.
  const lastRefresh = useRef(0);
  const signedIn = user !== null;

  useEffect(() => {
    if (!signedIn) {
      lastRefresh.current = 0;
      return undefined;
    }

    const renew = () => {
      if (Date.now() - lastRefresh.current < REFRESH_EVERY_MS) {
        return;
      }
      lastRefresh.current = Date.now();
      refreshSession().catch(() => {
        lastRefresh.current = 0;
      });
    };

    renew();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        renew();
      }
    });
    return () => subscription.remove();
  }, [signedIn]);

  // Once signed in, never leave the splash up for good if the home screen
  // can't say it's ready (no connection, say).
  useEffect(() => {
    if (!waiting || user === null) {
      return undefined;
    }
    const timer = setTimeout(() => setWaiting(false), HOME_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting, user]);

  // If the server says the session is over (a 401), go back to sign-in.
  // Reminders belong to the account, so they go too.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAllReminders();
      setWaiting(false);
      setUser(null);
    });
  }, []);

  const signOut = useCallback(async () => {
    // Back to sign-in straight away; the tidying up happens behind it.
    setWaiting(false);
    setUser(null);
    // Reminders belong to this account; don't leave them firing for the next.
    await clearAllReminders();
    await logout();
  }, []);

  return (
    <SessionContext.Provider
      value={{ user, setUser, booting, waiting, signIn, homeReady, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
