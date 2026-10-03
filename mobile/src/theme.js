// One place for the app's colours, so every screen matches the website.
// The stone greys are Tailwind's stone palette (what the website uses); the
// orange is sampled from the logo.
export const colours = {
  background: '#fafaf9',
  surface: '#ffffff',
  border: '#e7e5e4',
  ink: '#292524',
  body: '#57534e',
  muted: '#78716c',
  faint: '#a8a29e',
  orange: '#fb8a28',
  orangeSoft: '#fff1e5',
  teal: '#0d9488',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
};

// Soft drop shadow for things that float over the map. iOS reads the shadow*
// props; Android only understands elevation.
export const floating = {
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};
