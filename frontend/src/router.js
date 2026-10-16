import { useEffect, useState } from 'react';

// The website is one page. These few lines give it real addresses (/settings,
// /places, /terms) that work with the back button, without a router library.
const CHANGED = 'caltal:navigate';

export function navigate(path) {
  if (path === window.location.pathname) {
    return;
  }
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(CHANGED));
}

export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener(CHANGED, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(CHANGED, update);
    };
  }, []);

  return path;
}

// True while the window is at least this wide. Used to choose between the
// card on the left (computers) and the sheet at the bottom (phones).
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}
