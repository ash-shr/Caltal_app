import { useEffect, useRef, useState } from 'react';
import Icon from './icons';
import { searchPlaces } from './geo';

const MIN_LETTERS = 3;

// Wait this long after the last keypress before searching, so typing
// "Leeds station" sends one request rather than thirteen.
const PAUSE_MS = 350;

// The search box over the map.
//   getNear   returns { latitude, longitude } of the map's centre, to bias results
//   saved     the person's saved places, listed first (all of them before typing)
//   onSelect  a result was chosen
//   onClear   the box was emptied
//   onFocus   the box was clicked (on phones, Home lowers the sheet to make room)
function SearchBar({ getNear, saved, onSelect, onClear, onFocus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [noMatches, setNoMatches] = useState(false);
  const [open, setOpen] = useState(false);
  const input = useRef(null);

  // Saved places whose name contains what's typed; all of them before typing
  const typed = query.trim().toLowerCase();
  const savedMatches = saved.filter(place => place.name.toLowerCase().includes(typed));

  // Set when a result is picked, so filling the box with its name doesn't
  // immediately search for that name again
  const justPicked = useRef(false);

  const changeText = text => {
    setQuery(text);
    setOpen(true);
    if (text.trim().length < MIN_LETTERS) {
      setResults([]);
      setError('');
      setNoMatches(false);
    }
  };

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return undefined;
    }
    if (query.trim().length < MIN_LETTERS) {
      return undefined;
    }

    // Cancels a request that's still running when a newer one starts, so a
    // slow early answer can't overwrite a later one
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(query.trim(), getNear(), controller.signal);
        setResults(found);
        setError('');
        setNoMatches(found.length === 0);
      } catch (failure) {
        if (failure.name !== 'AbortError') {
          setError(failure.message);
        }
      } finally {
        setSearching(false);
      }
    }, PAUSE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, getNear]);

  const pick = place => {
    // Only when the text will actually change; otherwise the effect doesn't
    // run to reset the flag, and the next real search would be skipped
    if (place.name !== query) {
      justPicked.current = true;
    }
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    input.current?.blur();
    onSelect(place);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setError('');
    setNoMatches(false);
    setOpen(false);
    onClear();
  };

  // "No places found" only when nothing at all matched, saved places included
  const message =
    error !== '' ? error : noMatches && savedMatches.length === 0 ? 'No places found.' : '';
  const showList = open && (savedMatches.length > 0 || results.length > 0 || message !== '');

  const onKeyDown = event => {
    if (event.key === 'Enter') {
      const first = savedMatches[0] ?? results[0];
      if (first) {
        event.preventDefault();
        pick(first);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 shadow-lg ring-1 ring-stone-900/5">
        <Icon name="search" size={18} className="flex-none text-stone-400" />

        <input
          ref={input}
          value={query}
          onChange={event => changeText(event.target.value)}
          onFocus={() => {
            setOpen(true);
            onFocus?.();
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Search places"
          maxLength={120}
          autoComplete="off"
          aria-label="Search places"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
        />

        {searching ? (
          <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
        ) : query !== '' ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex-none rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>

      {showList && (
        // preventDefault on mousedown keeps the box focused, so clicking a
        // result picks it instead of first closing the list
        <ul
          onMouseDown={event => event.preventDefault()}
          className="absolute inset-x-0 top-14 z-10 max-h-80 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-lg ring-1 ring-stone-900/5"
        >
          {savedMatches.map(place => (
            <li key={`saved-${place.id}`}>
              <button
                type="button"
                onClick={() => pick(place)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
              >
                <Icon name="bookmark" size={18} filled className="flex-none text-caltal" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-stone-800">{place.name}</span>
                  <span className="block truncate text-xs text-stone-400">
                    {place.address ?? 'Saved place'}
                  </span>
                </span>
              </button>
            </li>
          ))}

          {message !== '' ? (
            <li className="px-4 py-2.5 text-sm text-stone-500">{message}</li>
          ) : (
            results.map(place => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => pick(place)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
                >
                  <Icon name="location" size={18} className="flex-none text-stone-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-stone-800">{place.name}</span>
                    <span className="block truncate text-xs text-stone-400">{place.address}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
