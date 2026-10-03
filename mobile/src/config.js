// Expo copies any variable starting with EXPO_PUBLIC_ from mobile/.env.local
// into the app when it bundles the JavaScript. .env.local is gitignored, so the
// key stays out of GitHub. (It is still inside the built app — every map key on
// a phone is — which is why it gets its own key, separate from the website's.)
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

export const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

export const API_URL = 'https://caltal.fly.dev/api';

// Where the map starts before we know where the person is: Leeds city centre.
export const DEFAULT_CENTRE = { latitude: 53.7997, longitude: -1.5492 };
