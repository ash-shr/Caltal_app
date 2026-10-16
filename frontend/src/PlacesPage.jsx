import { useState } from 'react';
import PageLayout from './PageLayout';
import Icon from './icons';
import { inputClass } from './ui';

// The most places one account can save: the server's limit (SavedPlaceService)
const MAX_PLACES = 20;

function PlaceRow({ place, onRename, onDelete, onShowOnMap }) {
  // 'idle', 'renaming' or 'deleting' (asking to confirm)
  const [state, setState] = useState('idle');
  const [name, setName] = useState(place.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async action => {
    setBusy(true);
    setError('');
    try {
      await action();
      setState('idle');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const smallButton =
    'rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ';

  return (
    <li className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      {state === 'renaming' ? (
        <form
          onSubmit={event => {
            event.preventDefault();
            if (name.trim() !== '') run(() => onRename(place, name.trim()));
          }}
          className="flex gap-2"
        >
          <input
            className={inputClass}
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={50}
            autoFocus
            aria-label="New name"
          />
          <button
            type="submit"
            disabled={busy || name.trim() === ''}
            className={smallButton + 'bg-stone-800 text-white hover:bg-stone-700'}
          >
            Save
          </button>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <Icon name="bookmark" size={20} filled className="mt-0.5 flex-none text-caltal" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-800">{place.name}</p>
            {place.address && <p className="truncate text-sm text-stone-400">{place.address}</p>}
          </div>
        </div>
      )}

      {state === 'deleting' ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm text-red-700">{`Delete ${place.name}?`}</p>
          <button
            type="button"
            onClick={() => run(() => onDelete(place.id))}
            disabled={busy}
            className={smallButton + 'bg-red-600 text-white hover:bg-red-700'}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            className={smallButton + 'text-stone-500 hover:bg-stone-100'}
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onShowOnMap(place)}
            className={smallButton + 'bg-stone-100 text-stone-700 hover:bg-stone-200'}
          >
            Show on map
          </button>
          {state === 'renaming' ? (
            <button
              type="button"
              onClick={() => {
                setName(place.name);
                setState('idle');
              }}
              className={smallButton + 'text-stone-500 hover:bg-stone-100'}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setState('renaming')}
              className={smallButton + 'text-stone-600 hover:bg-stone-100'}
            >
              Rename
            </button>
          )}
          <button
            type="button"
            onClick={() => setState('deleting')}
            className={smallButton + 'ml-auto text-red-600 hover:bg-red-50'}
          >
            Delete
          </button>
        </div>
      )}

      {error !== '' && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}

// Every saved place, to rename, delete, or find on the map. Places are added
// from the map: search for one and choose Save place, or save the spot while
// adding a task.
function PlacesPage({ places: placeList, onShowOnMap }) {
  const { places, error, rename, remove } = placeList;

  return (
    <PageLayout title="Saved places">
      {error !== '' && <p className="text-sm text-red-600">{`Couldn't load your places: ${error}`}</p>}

      {places.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-stone-500">
          No saved places yet. Search for a place on the map and choose Save place, or save the
          spot while adding a task. Saved places appear as chips in the task form, so pinning a
          task to Home or Work takes one click.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {places.map(place => (
              <PlaceRow
                key={place.id}
                place={place}
                onRename={rename}
                onDelete={remove}
                onShowOnMap={onShowOnMap}
              />
            ))}
          </ul>
          <p className="text-center text-sm text-stone-400">
            {`${places.length} of ${MAX_PLACES} places`}
          </p>
        </>
      )}
    </PageLayout>
  );
}

export default PlacesPage;
