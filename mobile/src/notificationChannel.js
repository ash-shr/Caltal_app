import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Android sorts notifications into "channels", and a channel's importance
// decides how a notification arrives. Without one of our own, Android uses a
// quiet default: the reminder slips into the notification list without
// popping up or making a sound. HIGH importance pops up on screen with sound.
// iPhones have no channels, so this does nothing there.
export const REMINDER_CHANNEL = 'reminders';

let ready = null;

// Safe to call as often as needed: the channel is only created once. Called
// before every notification is scheduled, because the geofence task can run
// with nothing else in the app loaded.
//
// Resolves to the channel id to use, or undefined if the channel couldn't be
// made — a notification on a channel that doesn't exist is never shown, so
// it's better then to fall back to Android's default one.
export function reminderChannel() {
  if (Platform.OS !== 'android') {
    return Promise.resolve(undefined);
  }

  if (!ready) {
    ready = Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Reminders',
      description: 'Time and place reminders for your tasks',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    }).then(
      () => REMINDER_CHANNEL,
      () => {
        ready = null; // let a later call try again
        return undefined;
      },
    );
  }

  return ready;
}
