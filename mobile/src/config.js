// Expo copies any variable starting with EXPO_PUBLIC_ from mobile/.env.local
// into the app when it bundles the JavaScript. .env.local is gitignored, so the
// key stays out of GitHub. (It is still inside the built app — every map key on
// a phone is — which is why it gets its own key, separate from the website's.)
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

export const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

// The website and the API behind it. caltal.fly.dev reaches the same server,
// and builds made before the move still use it.
export const WEBSITE_URL = 'https://caltal.app';

export const API_URL = `${WEBSITE_URL}/api`;

// Public pages on the website the app links to
export const PRIVACY_URL = `${WEBSITE_URL}/privacy`;

// Where people can reach whoever runs Caltal. The same address as the
// website's (frontend/src/config.js).
export const CONTACT_EMAIL = 'ash.shr.005@gmail.com';

// Where the map starts before we know where the person is: Leeds city centre.
export const DEFAULT_CENTRE = { latitude: 53.7997, longitude: -1.5492 };
