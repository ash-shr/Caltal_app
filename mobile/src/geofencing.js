import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pastDay, today } from './dates';
import { distanceMetres } from './geo';
import { reminderChannel } from './notificationChannel';
import { canRing, ringNow } from './ringing';
import { readStoredSettings } from './settings';

// The name the OS knows this background job by. It must be registered at module
// load — before React renders — because the system can start the app straight
// into this task with no UI at all.
export const GEOFENCE_TASK = 'caltal-geofence';

// Android and iOS both cap how many regions one app can monitor. iOS is the
// stricter of the two at 20, so keep a little inside it.
export const MAX_REGIONS = 18;

// What's currently registered with the phone: a fingerprint of the regions,
// and for each region its task's name, its day, and whether it has a voice
// note (for the notification, or the ringing screen). Saved on the phone
// because the background task can run with the rest of the app not loaded at
// all.
const WATCHED_KEY = 'caltal_watched_places';

async function readWatched() {
  try {
    const raw = await AsyncStorage.getItem(WATCHED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// The circles the phone is inside right now, as far as Caltal knows, with
// when it was last seen inside: { 'task-12': 1793300000000 }. You're reminded
// once per visit: when you arrive, or when Caltal finds you're already
// inside. Re-registering the circles, or opening Caltal while you're still
// there, doesn't remind you again. Leaving clears it, so the next visit
// reminds you again.
const INSIDE_KEY = 'caltal_inside_places';

// If the phone never reports leaving (it can miss one), an arrival this long
// after Caltal last saw you inside counts as a new visit anyway
const VISIT_FORGOTTEN_MS = 12 * 60 * 60 * 1000;

// How far outside a circle the phone must be seen before Caltal counts it as
// having left, so a wobbly location fix at the edge doesn't count as a new
// visit
const LEAVE_MARGIN_METRES = 100;

// Location fixes vaguer than this are ignored for "are you inside?"
const MAX_FIX_ERROR_METRES = 200;

async function readInside() {
  try {
    const raw = await AsyncStorage.getItem(INSIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeInside(inside) {
  await AsyncStorage.setItem(INSIDE_KEY, JSON.stringify(inside));
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.log('Geofence task error', error);
    return;
  }

  const { eventType, region } = data;
  const inside = await readInside();

  if (eventType === Location.GeofencingEventType.Exit) {
    if (inside[region.identifier]) {
      delete inside[region.identifier];
      await writeInside(inside);
    }
    return;
  }

  if (eventType !== Location.GeofencingEventType.Enter) {
    return;
  }

  // Already reminded about this visit
  const lastSeen = inside[region.identifier];
  if (lastSeen && Date.now() - lastSeen < VISIT_FORGOTTEN_MS) {
    return;
  }

  inside[region.identifier] = Date.now();
  await writeInside(inside);
  await announceArrival(region.identifier, await readWatched());
});

// The reminder for arriving at a task's place. The task's time, if it has
// one, doesn't matter here: being inside the circle is enough, at any hour.
// The time reminder is separate (timeReminders.js) and still comes at its time.
async function announceArrival(identifier, watched) {
  const title = watched?.names?.[identifier] ?? 'A task is nearby';
  const body = arrivalMessage(watched?.dueDates?.[identifier]);

  // Set to ring like an alarm (Android): the ringing screen instead
  const settings = await readStoredSettings();
  if (settings.ringReminders && canRing) {
    const taskId = Number(identifier.replace('task-', ''));
    await ringNow({
      // Each arrival rings on its own
      id: `place-${identifier}-${Date.now()}`,
      at: Date.now(),
      title,
      body,
      taskId: Number.isFinite(taskId) ? taskId : null,
      hasVoiceNote: Boolean(watched?.voiceNotes?.[identifier]),
    });
    return;
  }

  const channelId = await reminderChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    // A channel and no time means "show it now, on that channel". null means
    // "show it now" on the default one.
    trigger: channelId ? { channelId } : null,
  });
}

// Where the phone is now, or null if that can't be known well enough. The
// last known position is instant; a fresh fix is only taken if that's old.
async function currentPosition() {
  try {
    const recent = await Location.getLastKnownPositionAsync({
      maxAge: 2 * 60 * 1000,
      requiredAccuracy: MAX_FIX_ERROR_METRES,
    });
    if (recent) {
      return recent.coords;
    }

    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise(resolve => setTimeout(() => resolve(null), 10000)),
    ]);
    if (fresh && (fresh.coords.accuracy ?? 0) <= MAX_FIX_ERROR_METRES) {
      return fresh.coords;
    }
  } catch {
    // No fix: the circles themselves still report arrivals
  }
  return null;
}

// The phone only reports crossing into a circle. If you're already inside
// one (you've just pinned a task where you're standing, or the report never
// came), nothing would remind you. So whenever Caltal brings its reminders up
// to date (it's opened, comes back to the front, or a task is saved), it also
// checks where the phone is now. Returns the circles you're newly found inside;
// the caller reminds you about them.
export async function findCirclesYouAreIn(regions, here) {
  const inside = await readInside();
  const watching = new Set(regions.map(region => region.identifier));
  const arrivals = [];
  let changed = false;

  // Forget circles that are no longer watched (done, deleted, moved)
  for (const identifier of Object.keys(inside)) {
    if (!watching.has(identifier)) {
      delete inside[identifier];
      changed = true;
    }
  }

  if (here) {
    for (const region of regions) {
      const distance = distanceMetres(
        here.latitude,
        here.longitude,
        region.latitude,
        region.longitude,
      );

      if (distance <= region.radius) {
        // Inside: remind only if this is a new visit, and note the time either way
        if (!inside[region.identifier]) {
          arrivals.push(region.identifier);
        }
        inside[region.identifier] = Date.now();
        changed = true;
      } else if (distance > region.radius + LEAVE_MARGIN_METRES && inside[region.identifier]) {
        delete inside[region.identifier];
        changed = true;
      }
    }
  }

  if (changed) {
    await writeInside(inside);
  }
  return arrivals;
}

// What an arrival says. An unfinished task from a day that has passed still
// reminds you when you get there, but says it's an older one and which day it
// was for, so it isn't mistaken for something new.
export function arrivalMessage(dueDate, todayText = today()) {
  if (dueDate && dueDate < todayText) {
    // The older day first, so it shows even when the phone cuts the text short
    return `Older task, from ${pastDay(dueDate)}. You're near where it needs doing.`;
  }
  return 'You are near somewhere you have something to do.';
}

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
    // Leaving is told too, only so the next visit reminds you again
    notifyOnExit: true,
  }));

  if (regions.length === 0) {
    await stopWatching();
    return 0;
  }

  // Registering a region makes the phone check straight away whether you're
  // already inside it, and say "arrived" if you are. Re-registering only
  // when the regions actually changed keeps that to a minimum; the record of
  // which circles you're inside (INSIDE_KEY) stops it reminding you twice
  // about one visit. The names, voice notes and days are saved every time:
  // they can change without the regions changing.
  const fingerprint = JSON.stringify(regions);
  const watched = await readWatched();
  const running = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);

  const names = Object.fromEntries(chosen.map(task => [`task-${task.id}`, task.name]));
  const voiceNotes = Object.fromEntries(
    chosen.map(task => [`task-${task.id}`, task.voiceNoteMs != null]),
  );
  const dueDates = Object.fromEntries(chosen.map(task => [`task-${task.id}`, task.dueDate]));
  await AsyncStorage.setItem(
    WATCHED_KEY,
    JSON.stringify({ fingerprint, names, voiceNotes, dueDates }),
  );

  // Where you are now is checked first, so the "arrived" that registering
  // may bring for a circle you're in finds it already dealt with
  const arrivals = await findCirclesYouAreIn(regions, await currentPosition());

  if (!running || watched?.fingerprint !== fingerprint) {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  }

  const latest = { names, voiceNotes, dueDates };
  for (const identifier of arrivals) {
    await announceArrival(identifier, latest);
  }

  return regions.length;
}

export async function stopWatching() {
  await AsyncStorage.removeItem(WATCHED_KEY);
  await AsyncStorage.removeItem(INSIDE_KEY);
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

  // Android 13+ won't show the notifications prompt until the app has at
  // least one notification channel, so make ours first.
  await reminderChannel();
  const notifications = await Notifications.requestPermissionsAsync();

  if (!notifications.granted) {
    return { ok: false, reason: 'Notification permission was denied.' };
  }

  return { ok: true };
}
