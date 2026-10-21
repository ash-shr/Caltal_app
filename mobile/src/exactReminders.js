import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import CaltalAlarm from '../modules/caltal-alarm';

// Whether time reminders go off at the exact minute.
//
// Since Android 12, an app needs the person's say-so to set exact alarms
// ("Alarms & reminders" in the phone's settings), and from Android 14 that
// starts off for new installs. Caltal asks for SCHEDULE_EXACT_ALARM, the
// permission the person grants, rather than USE_EXACT_ALARM, which Google
// Play only allows for alarm-clock and calendar apps. Without it, reminders
// still arrive, but Android may hold them back by a few minutes, longer when
// the phone has been idle.
//
// iPhones always deliver on time, so there's nothing to ask there.
const askable = Platform.OS === 'android' && CaltalAlarm != null;

export function exactRemindersAllowed() {
  return askable ? CaltalAlarm.canScheduleExact() : true;
}

// Opens the phone's switch for it. When the person comes back to Caltal, the
// task list reloads and every reminder is set again, exactly this time.
export function openExactReminderSettings() {
  if (askable) {
    CaltalAlarm.openExactAlarmSettings();
  }
}

// For screens that show a prompt: looks again whenever Caltal comes back to
// the front, since that's when the person may have just switched it on.
export function useExactRemindersAllowed() {
  const [allowed, setAllowed] = useState(exactRemindersAllowed);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setAllowed(exactRemindersAllowed());
      }
    });
    return () => subscription.remove();
  }, []);

  return allowed;
}
