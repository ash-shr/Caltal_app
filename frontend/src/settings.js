import { RADIUS_DEFAULT, RADIUS_MAX, RADIUS_MIN } from './config';

// Settings that belong to this browser, not the account, kept in localStorage.
// (The phone app keeps its own, the same way.) Every read and write is
// wrapped: private windows and blocked storage throw, and the defaults are
// fine then.
const RADIUS_KEY = 'caltal_default_radius';

export function getDefaultRadius() {
  try {
    const saved = Number(localStorage.getItem(RADIUS_KEY));
    return saved >= RADIUS_MIN && saved <= RADIUS_MAX ? saved : RADIUS_DEFAULT;
  } catch {
    return RADIUS_DEFAULT;
  }
}

export function setDefaultRadius(radius) {
  try {
    localStorage.setItem(RADIUS_KEY, String(radius));
  } catch {
    // Not saved; the slider still shows the choice for this visit
  }
}
