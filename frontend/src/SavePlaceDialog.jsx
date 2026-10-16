import { useEffect, useState } from 'react';
import { SUGGESTED_NAMES } from './usePlaces';
import { buttonClass, inputClass } from './ui';

// Asks for a name and saves a spot as a place. `spot` is
// { latitude, longitude, name?, address? }: a name from a search result is
// offered as a starting point.
//
// Home shows it by rendering it and hides it by not rendering it, so each
// time it opens it starts fresh with the new spot.
function SavePlaceDialog({ spot, places, onSave, onClose }) {
  const [name, setName] = useState(spot.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Only suggest names that aren't taken yet
  const taken = new Set(places.map(place => place.name.toLowerCase()));
  const suggestions = SUGGESTED_NAMES.filter(suggestion => !taken.has(suggestion.toLowerCase()));

  // Escape closes it, as with any dialog
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async event => {
    event.preventDefault();
    if (busy || name.trim() === '') {
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        latitude: spot.latitude,
        longitude: spot.longitude,
        address: spot.address ?? null,
      });
      onClose();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/30 px-6 backdrop-blur-sm"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-place-title"
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl"
      >
        <div>
          <h2 id="save-place-title" className="text-lg font-semibold tracking-tight text-stone-800">
            Save this place
          </h2>
          {spot.address && <p className="mt-1 text-sm text-stone-500">{spot.address}</p>}
        </div>

        <input
          className={inputClass}
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Name it, like Home or Gym"
          maxLength={50}
          autoFocus
          aria-label="Place name"
        />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className={
                  'rounded-full px-3 py-1.5 text-sm transition-colors ' +
                  (name === suggestion
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-50 text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300')
                }
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {error !== '' && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <button type="submit" disabled={busy || name.trim() === ''} className={buttonClass}>
            {busy ? 'Saving…' : 'Save place'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1 text-sm text-stone-500 hover:text-stone-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default SavePlaceDialog;
