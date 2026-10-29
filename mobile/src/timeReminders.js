import * as Notifications from 'expo-notifications';
import { reminderChannel } from './notificationChannel';
import {
  canRing,
  cancelRinging,
  replaceRinging,
  ringingAlarm,
  scheduleRinging,
} from './ringing';

// Time reminders are scheduled on the phone itself. Once handed to the OS they
// fire at the right moment even if the app is closed or the phone is offline —
// the server is never involved.
const PREFIX = 'caltal-time-';

// iOS keeps at most 64 scheduled notifications per app and silently drops the
// rest, so schedule the soonest 60 and leave a little room.
const MAX_SCHEDULED = 60;

// dueDate '2026-10-02' + remindAt '14:30:00' → that moment in the phone's own
// time zone. Building the Date from parts (not parsing a string) keeps it local.
function reminderTime(task) {
  if (!task.dueDate || !task.remindAt) {
    return null;
  }

  const [year, month, day] = task.dueDate.split('-').map(Number);
  const [hour, minute] = task.remindAt.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute);
}

// Both kinds: the ordinary notifications and, on Android, the ringing ones
export async function clearTimeReminders() {
  await clearNotificationReminders();
  await cancelRinging();
}

async function clearNotificationReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(notification => notification.identifier.startsWith(PREFIX))
      .map(notification =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

// Whether the phone lets Caltal show notifications at all. Doesn't ask.
export async function notificationsAllowed() {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

// ask: false only checks. Used until the set-up screen has been shown, so its
// questions come one at a time, in order, instead of on top of each other.
// Either way it only asks if the person has never answered: after a "no",
// asking again straight away would be a nag, and Android stops showing the
// question at all after a second "no". Settings then offers the phone's
// settings instead.
async function canNotify({ ask = true } = {}) {
  // Android 13+ won't show the permission prompt until the app has at least
  // one notification channel, so make ours first.
  await reminderChannel();

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!ask || current.status !== 'undetermined') {
    return false;
  }

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Replaces whatever was scheduled before with reminders for these tasks.
// ring: they ring like an alarm instead of being notifications (Android).
// ask: whether it may ask for notification permission (see canNotify).
// Returns how many were scheduled.
export async function scheduleTimeReminders(tasks, { ring = false, ask = true } = {}) {
  if (!(await canNotify({ ask }))) {
    return 0;
  }

  const now = Date.now();

  const upcoming = tasks
    .filter(task => !task.complete)
    .map(task => ({ task, at: reminderTime(task) }))
    .filter(({ at }) => at !== null && at.getTime() > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED);

  await clearNotificationReminders();

  if (ring && canRing) {
    // Snoozed ones are kept; everything else is replaced
    await replaceRinging(
      upcoming.map(({ task, at }) =>
        ringingAlarm(task, {
          id: `time-${task.id}`,
          at: at.getTime(),
          body: `Reminder for ${task.remindAt.slice(0, 5)}`,
        }),
      ),
    );
    return upcoming.length;
  }

  await cancelRinging();
  const channelId = await reminderChannel();

  for (const { task, at } of upcoming) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${task.id}`,
      content: {
        title: task.name,
        body: `Reminder for ${task.remindAt.slice(0, 5)}`,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        // On Android, the loud "Reminders" channel; on iPhone, undefined
        ...(channelId ? { channelId } : {}),
      },
    });
  }

  return upcoming.length;
}

// For Settings: a reminder a minute from now, sent exactly the way real ones
// are, so it shows whether reminders reach this phone at all. Returns false if
// the phone won't allow notifications.
export async function sendTestReminder({ ring = false } = {}) {
  if (!(await canNotify())) {
    return false;
  }

  if (ring && canRing) {
    await scheduleRinging({
      id: 'test',
      at: Date.now() + 60 * 1000,
      title: 'Test reminder',
      body: 'This is how Caltal rings. Answer, snooze or dismiss it.',
      taskId: null,
      hasVoiceNote: false,
    });
    return true;
  }

  const channelId = await reminderChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: 'caltal-test',
    content: {
      title: 'Test reminder',
      body: 'Time reminders are working on this phone.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 60 * 1000),
      ...(channelId ? { channelId } : {}),
    },
  });

  return true;
}
