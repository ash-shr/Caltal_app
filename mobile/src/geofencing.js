import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { today } from './dates';

// The name the OS knows this background job by. It must be registered at module
// load — before React renders — because the system can start the app straight
// into this task with no UI at all.
export const GEOFENCE_TASK = 'caltal-geofence';

// Android and iOS both cap how many regions one app can monitor. iOS is the
// stricter of the two at 20, so keep a little inside it.
export const MAX_REGIONS = 18;

// What's currently registered with the phone: a fingerprint of the regions,
// and each region's task name for the notification. Saved on the phone because
// the background task can run with the rest of the app not loaded at all.
const WATCHED_KEY = 'caltal_watched_places';

async function readWatched() {
  try {
    const raw = await AsyncStorage.getItem(WATCHED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.log('Geofence task error', error);
    return;
  }

  const { eventType, region } = data;

  // Only announce arrivals. Leaving a place is not interesting yet.
  if (eventType !== Location.GeofencingEventType.Enter) {
    return;
  }

  const watched = await readWatched();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: watched?.names?.[region.identifier] ?? 'A task is nearby',
      body: 'You are near somewhere you have something to do.',
    },
    // null means "right now"
    trigger: null,
  });
});

// Hand the OS the list of circles to watch, replacing any registered before.
export async function watchPlaces(tasks) {
  const todayText = today();

  // A task can name a second place to be reminded at — somewhere on the way,
  // rather than the task's own location. The backend works out which applies
  // and exposes it as reminderLatitude / reminderLongitude / reminderRadius.
  //
  // The phone can only watch a few regions, so spend them on what's still to
  // do: today's and upcoming tasks first (soonest first), then unfinished
  // tasks from past days (most recent first).
  const open = tasks.filter(
    task =>
      !task.complete && task.reminderLatitude != null && task.reminderLongitude != null,
  );
  const upcoming = open
    .filter(task => task.dueDate >= todayText)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = open
    .filter(task => task.dueDate < todayText)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const chosen = [...upcoming, ...overdue].slice(0, MAX_REGIONS);

  const regions = chosen.map(task => ({
    // The id, not the name: two tasks can share a name, and the phone
    // replaces a region whose identifier it has already seen.
    identifier: `task-${task.id}`,
    latitude: task.reminderLatitude,
    longitude: task.reminderLongitude,
    // A radius under ~100m is unreliable in practice: phone GPS is not that
    // precise, and the OS uses cell and wifi positioning to save battery.
    radius: Math.max(task.reminderRadius ?? 200, 100),
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  if (regions.length === 0) {
    await stopWatching();
    return 0;
  }

  // Registering a region makes the phone check straight away whether you're
  // already inside it — and say "arrived" if you are. So re-register only
  // when the regions actually changed, or opening the app at home would
  // remind you about your home task every single time.
  const fingerprint = JSON.stringify(regions);
  const watched = await readWatched();
  const running = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);

  if (running && watched?.fingerprint === fingerprint) {
    return regions.length;
  }

  const names = Object.fromEntries(chosen.map(task => [`task-${task.id}`, task.name]));
  await AsyncStorage.setItem(WATCHED_KEY, JSON.stringify({ fingerprint, names }));
  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  return regions.length;
}

export async function stopWatching() {
  await AsyncStorage.removeItem(WATCHED_KEY);
  if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}

// True when place reminders could run right now without asking anything:
// both location permissions and notifications are already granted.
export async function hasPlacePermissions() {
  const [foreground, background, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);

  return foreground.granted && background.granted && notifications.granted;
}

// Permissions come in two stages, and they must be asked for in this order:
// the OS will not consider a background request until foreground is granted.
export async function requestPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== 'granted') {
    return { ok: false, reason: 'Location permission was denied.' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();

  if (background.status !== 'granted') {
    return {
      ok: false,
      reason:
        'Background location is off. Caltal needs "Allow all the time" to ' +
        'remind you when the app is closed — you can change it in Settings.',
    };
  }

  const notifications = await Notifications.requestPermissionsAsync();

  if (!notifications.granted) {
    return { ok: false, reason: 'Notification permission was denied.' };
  }

  return { ok: true };
}
