import * as Notifications from 'expo-notifications';
import { clearTimeReminders, scheduleTimeReminders } from './timeReminders';
import { hasPlacePermissions, stopWatching, watchPlaces } from './geofencing';

// Without this, a notification arriving while the app is open is delivered
// silently — the OS assumes the app will show it itself.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Syncs run one after another, never side by side. Otherwise an older sync
// that happens to finish last could undo a newer one — switching place
// reminders back off just after they were turned on, say.
let queue = Promise.resolve();

// Goes up by one on every sign-out. A sync that started before a sign-out
// sees the number has changed and stops, so it can't reschedule reminders for
// someone who has just left.
let generation = 0;

function enqueue(job) {
  queue = queue.then(job).catch(error => {
    // Reminders are a background nicety; a failure here must never break the
    // screen the person is looking at.
    console.log('Reminder sync failed', error);
  });
  return queue;
}

// Brings what the phone has scheduled in line with the latest tasks and the
// person's settings. Called after every load of the task list. getSettings is
// read when the sync actually runs, so it always uses the newest settings.
//
// It never asks for location permission itself — that only happens when the
// person switches place reminders on in Settings, where the reason is clear.
export function syncReminders(tasks, getSettings) {
  const mine = generation;

  return enqueue(async () => {
    if (mine !== generation) return;
    const settings = getSettings();

    if (settings.timeReminders) {
      await scheduleTimeReminders(tasks);
    } else {
      await clearTimeReminders();
    }

    if (mine !== generation) return;

    if (settings.placeReminders && (await hasPlacePermissions())) {
      await watchPlaces(tasks);
    } else {
      await stopWatching();
    }
  });
}

// On sign-out, session expiry and account deletion.
export function clearAllReminders() {
  generation += 1;

  return enqueue(async () => {
    await clearTimeReminders();
    await stopWatching();
  });
}
