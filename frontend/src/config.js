// The same MapTiler key as the phone app's. It comes from the deploy (the
// MAPTILER_KEY secret on GitHub), or from frontend/.env.local for `npm run dev`,
// so it isn't in the code. In the MapTiler dashboard it's restricted to
// caltal.app, www.caltal.app, caltal.fly.dev and localhost, plus "?" for the
// phone app, which sends no website address. Visible in the website's bundle,
// as any map key is; the address list is what protects it. A new address for
// the website has to be added there too, or the map stays blank on it.
export const MAP_KEY = import.meta.env.VITE_MAP_KEY ?? '';

// The same map style as the phone app (mobile/src/config.js)
export const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAP_KEY}`;

// Where the map starts before we know where the person is: Leeds city centre
export const DEFAULT_CENTRE = { latitude: 53.7997, longitude: -1.5492 };

// The same limits as the phone app's radius slider
export const RADIUS_MIN = 50;
export const RADIUS_MAX = 2000;
export const RADIUS_DEFAULT = 200;

// Colours the map draws with. Map layers need real colour values, not
// Tailwind class names.
export const MAP_COLOURS = {
  ink: '#292524',
  orange: '#fb8a28',
  teal: '#0d9488',
  faint: '#a8a29e',
  white: '#ffffff',
};

// How tall the panel is on a phone, as a share of the screen: peeking, half
// and nearly full. The same stops as the phone app's sheet.
export const SHEET_STOPS = [0.18, 0.5, 0.92];
export const SHEET_HALF = 1;

// The "Web application" OAuth client from Google Cloud, for the "Sign in with
// Google" button. Public by design: Google puts it on every page that shows
// the button. A build can still override it with VITE_GOOGLE_CLIENT_ID.
// The same ID as the phone app's (mobile/src/config.js) and the server's
// (GOOGLE_CLIENT_ID in fly.toml).
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '840617417263-275r24qrj30ieclkaer6nr9hk5c3ju9a.apps.googleusercontent.com';

// Where people can reach whoever runs Caltal: shown on the privacy policy and
// the delete-your-account page. Google Play needs a contact address too.
// Empty until one is chosen, and the pages leave the line out until then.
export const CONTACT_EMAIL = 'ash.shr.005@gmail.com';

//test1