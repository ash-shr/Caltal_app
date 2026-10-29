import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings that only matter on this phone live on this phone. They're not
// secret, so AsyncStorage (plain on-device storage) is enough — SecureStore is
// kept for the session token.
export const STORAGE_KEY = 'caltal_settings';

export const DEFAULT_SETTINGS = {
  timeReminders: true,
  // Off until the person turns it on: it needs "Always" location permission,
  // which is better asked for when they choose it than at first launch.
  placeReminders: false,
  // Android: reminders ring like an alarm, full screen, instead of being
  // ordinary notifications. Off until the person chooses it.
  ringReminders: false,
  defaultRadius: 200,
  // Whether the "Set up your reminders" screen, which asks for every
  // permission in one go, has been shown on this phone (PermissionsSetup)
  setupShown: false,
};

// For the place-reminder task, which can run with the rest of the app not
// loaded: the saved settings, read straight from the phone's storage.
export async function readStoredSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

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
