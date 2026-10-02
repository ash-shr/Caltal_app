import { useEffect, useRef } from 'react';

// Public by design: Google puts this on every page that shows its button.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// Loaded once, the first time a button needs it, rather than on every page.
let scriptLoading = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Could not reach Google. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptLoading;
}

// Google draws the button itself, inside an iframe, so it always looks like
// Google's button — their brand rules require that, and it's what people trust.
// When someone picks an account, Google calls back with an ID token.
function GoogleButton({ onCredential, onError }) {
  const container = useRef(null);

  // The latest callbacks, so the button — set up only once — never calls a
  // stale one.
  const handlers = useRef({ onCredential, onError });

  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: response => handlers.current.onCredential(response.credential),
        });

        window.google.accounts.id.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(container.current.offsetWidth || 320, 400),
        });
      })
      .catch(error => handlers.current.onError?.(error.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // No client ID configured: show nothing rather than a broken button
  if (!CLIENT_ID) return null;

  return <div ref={container} className="flex min-h-10 justify-center" />;
}

export default GoogleButton;
