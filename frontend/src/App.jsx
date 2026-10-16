import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Auth from './Auth';
import PlacesPage from './PlacesPage';
import ResetPassword from './ResetPassword';
import SettingsPage from './SettingsPage';
import Splash from './Splash';
import TermsPage from './TermsPage';
import VerifyEmail from './VerifyEmail';
import { getStoredUser, logout } from './api';
import { navigate, usePath } from './router';
import { usePlaces } from './usePlaces';
import { useTasks } from './useTasks';

// The map home pulls in the map library, the biggest part of the site by far.
// Loading it separately means the sign-in page and the pages emailed links
// open don't have to wait for it.
const Home = lazy(() => import('./Home'));

// How long the splash stays up at minimum. Long enough to read as deliberate
// rather than a flicker, short enough not to be in the way.
const SPLASH_MS = 1400;

function App() {
  const [user, setUser] = useState(getStoredUser());
  const [booting, setBooting] = useState(true);
  const path = usePath();

  // Every reload starts on the splash, the way an app does
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    logout()
      .catch(() => {
        // Already signed out locally; nothing useful to show if the server missed it
      })
      .finally(() => setUser(null));
  };

  if (booting) {
    return <Splash />;
  }

  // The two pages emailed links open
  if (path === '/reset-password') {
    return <ResetPassword />;
  }

  if (path === '/verify-email') {
    return <VerifyEmail user={user} onAuthenticated={setUser} onSignOut={handleSignOut} />;
  }

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <SignedIn
      user={user}
      path={path}
      onUserChange={setUser}
      onSignOut={handleSignOut}
      onAccountDeleted={() => {
        setUser(null);
        navigate('/');
      }}
    />
  );
}

// Everything behind sign-in. Tasks and saved places are loaded once here and
// shared by the map and the pages, so they always agree. The map stays
// loaded under the pages (/settings, /places, /terms), which lie on top of it.
function SignedIn({ user, path, onUserChange, onSignOut, onAccountDeleted }) {
  const tasks = useTasks();
  const places = usePlaces();
  const home = useRef(null);

  return (
    <Suspense fallback={<Splash />}>
      <Home ref={home} user={user} tasks={tasks} places={places} onSignOut={onSignOut} />

      {path === '/settings' && (
        <SettingsPage
          user={user}
          onUserChange={onUserChange}
          onAccountDeleted={onAccountDeleted}
        />
      )}

      {path === '/places' && (
        <PlacesPage
          places={places}
          onShowOnMap={place => {
            navigate('/');
            home.current?.showPlace(place);
          }}
        />
      )}

      {path === '/terms' && <TermsPage />}
    </Suspense>
  );
}

export default App;
