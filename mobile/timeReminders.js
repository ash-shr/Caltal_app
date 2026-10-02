import * as Notifications from 'expo-notifications';
import { getAllTasks } from './api';

// Every reminder this file schedules carries this prefix, so it can find and
// cancel its own without touching anything else the app might schedule.
const PREFIX = 'caltal-time-';

// iOS keeps at most 64 scheduled notifications per app and silently drops the
// rest, so only the soonest ones are handed over.
const MAX_SCHEDULED = 60;

// A task's date and time, as a moment on this phone's clock. The server stores
// "2026-09-30" and "14:30" with no timezone, meaning 14:30 wherever you are.
function reminderTime(task) {
  if (!task.remindAt || !task.dueDate) return null;

  const [year, month, day] = task.dueDate.split('-').map(Number);
  const [hour, minute] = task.remindAt.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export async function clearTimeReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(notification => notification.identifier.startsWith(PREFIX))
      .map(notification =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

async function canNotify() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Hands every upcoming timed reminder to the phone's operating system, which
// fires it at the right moment even if Caltal is closed.
//
// The limit: the phone only knows about tasks it has seen. A timed task added
// on the website is scheduled the next time this runs — when the app is opened
// or refreshed. Reminding a phone that never opens the app needs push
// notifications from the server, which is a later piece of work.
export async function syncTimeReminders() {
  // Fetch first: if we're offline, this throws and the reminders already
  // scheduled stay exactly as they were.
  const tasks = await getAllTasks();
  const now = Date.now();

  const upcoming = tasks
    .filter(task => !task.complete)
    .map(task => ({ task, at: reminderTime(task) }))
    .filter(({ at }) => at !== null && at.getTime() > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED);

  // Start from a clean slate each time, so edited, completed and deleted tasks
  // don't leave stale reminders behind.
  await clearTimeReminders();

  if (upcoming.length === 0) return 0;
  if (!(await canNotify())) return 0;

  for (const { task, at } of upcoming) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${task.id}`,
      content: {
        title: task.name,
        body: `Reminder for ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });
  }

  return upcoming.length;
}
