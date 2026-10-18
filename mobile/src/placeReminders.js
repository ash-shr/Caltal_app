import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { requestPermissions } from './geofencing';
import { useSettings } from './settings';

// Google Play's rule for apps that use location in the background: before the
// phone asks for permission, the app has to say in its own words that it
// collects location data when the app is closed, what for, and what happens to
// it. The same words appear on the website's privacy page and in the store
// listing, as the rule also requires, so change them all together.
export const LOCATION_NOTICE =
  'Caltal collects location data to enable place reminders, even when the app is closed or ' +
  'not in use. It compares where you are with the places you pin tasks to, and reminds you ' +
  'when you arrive near one. Your location stays on your phone: it is not sent to ' +
  'Caltal’s server.';

// Resolves true if they chose to carry on to the permission prompt
function askToUseLocation() {
  return new Promise(resolve => {
    Alert.alert(
      'Use your location in the background?',
      LOCATION_NOTICE,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      // Android: tapping outside the box closes it, which counts as "Not now"
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

// Turning place reminders on and off, shared by the Settings screen and the
// banner on the home screen so both behave exactly the same.
export function usePlaceReminders() {
  const { settings, updateSettings } = useSettings();

  // Why switching on didn't work, if it didn't (a permission was refused)
  const [problem, setProblem] = useState('');

  const turnOn = useCallback(async () => {
    setProblem('');

    // Asked here, when the person has just chosen this, rather than at first
    // launch when they'd have no idea why an app wants their location. The
    // notice comes first, unless permission was already given.
    const background = await Location.getBackgroundPermissionsAsync();
    if (!background.granted && !(await askToUseLocation())) {
      return false;
    }

    const permission = await requestPermissions();

    if (permission.ok) {
      updateSettings({ placeReminders: true });
      return true;
    }

    setProblem(permission.reason);
    return false;
  }, [updateSettings]);

  const turnOff = useCallback(() => {
    setProblem('');
    updateSettings({ placeReminders: false });
  }, [updateSettings]);

  return { on: settings.placeReminders, turnOn, turnOff, problem };
}
