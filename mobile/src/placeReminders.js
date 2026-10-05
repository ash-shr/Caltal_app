import { useCallback, useState } from 'react';
import { requestPermissions } from './geofencing';
import { useSettings } from './settings';

// Turning place reminders on and off, shared by the Settings screen and the
// banner on the home screen so both behave exactly the same.
export function usePlaceReminders() {
  const { settings, updateSettings } = useSettings();

  // Why switching on didn't work, if it didn't (a permission was refused)
  const [problem, setProblem] = useState('');

  const turnOn = useCallback(async () => {
    setProblem('');

    // Asked here, when the person has just chosen this, rather than at first
    // launch when they'd have no idea why an app wants their location.
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
