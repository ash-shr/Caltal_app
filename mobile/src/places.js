import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from './api';

// The person's saved places (Home, Work…), loaded once and shared by the map,
// the search bar, the task form and the Saved places screen.
const PlacesContext = createContext(null);

export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState('');

  // As with tasks: an answer older than the latest request is ignored
  const latestLoad = useRef(0);

  const refresh = useCallback(() => {
    latestLoad.current += 1;
    const mine = latestLoad.current;

    return api.getPlaces().then(
      latest => {
        if (mine === latestLoad.current) {
          setPlaces(latest);
          setError('');
        }
        return latest;
      },
      failure => {
        if (mine === latestLoad.current) {
          setError(failure.message);
        }
        return null;
      },
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async place => {
      const saved = await api.createPlace(place);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const rename = useCallback(
    async (place, name) => {
      const saved = await api.updatePlace(place.id, {
        name,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address,
      });
      await refresh();
      return saved;
    },
    [refresh],
  );

  const remove = useCallback(
    async id => {
      await api.deletePlace(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <PlacesContext.Provider value={{ places, error, refresh, save, rename, remove }}>
      {children}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  return useContext(PlacesContext);
}

// Is there a saved place at (almost exactly) this spot? Within ~10 metres
// counts, so a place picked from the list isn't offered for saving again.
export function savedPlaceAt(places, latitude, longitude) {
  return (
    places.find(
      place =>
        Math.abs(place.latitude - latitude) < 0.0001 &&
        Math.abs(place.longitude - longitude) < 0.0001,
    ) ?? null
  );
}

// Names offered when saving, as one-tap shortcuts
export const SUGGESTED_NAMES = ['Home', 'Work', 'Gym', 'School', 'Shop'];
