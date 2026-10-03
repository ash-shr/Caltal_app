import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings that only matter on this phone live on this phone. They're not
// secret, so AsyncStorage (plain on-device storage) is enough — SecureStore is
// kept for the session token.
const STORAGE_KEY = 'caltal_settings';

export const DEFAULT_SETTINGS = {
  timeReminders: true,
  // Off until the person turns it on: it needs "Always" location permission,
  // which is better asked for when they choose it than at first launch.
  placeReminders: false,
  defaultRadius: 200,
};

export const RADIUS_MIN = 50;
export const RADIUS_MAX = 2000;

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          // Spread over the defaults so a setting added in a later version
          // still has a value for people who saved settings before it existed.
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateSettings = useCallback(changes => {
    setSettings(current => {
      const next = { ...current, ...changes };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
