import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

// The name the OS knows this background job by. It must be registered at module
// load — before React renders — because the system can start the app straight
// into this task with no UI at all.
export const GEOFENCE_TASK = 'caltal-geofence';

// Android and iOS both cap how many regions one app can monitor. iOS is the
// stricter of the two at 20, so keep well inside it.
export const MAX_REGIONS = 20;

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

  await Notifications.scheduleNotificationAsync({
    content: {
      title: region.identifier || 'A task is nearby',
      body: 'You are near somewhere you have something to do.',
    },
    // null means "right now"
    trigger: null,
  });
});

// Hand the OS the list of circles to watch. Anything previously registered is
// replaced, so this is safe to call whenever the task list changes.
export async function watchPlaces(tasks) {
  // A task can name a second place to be reminded at — somewhere on the way,
  // rather than the task's own location. The backend works out which applies
  // and exposes it as reminderLatitude / reminderLongitude / reminderRadius.
  const regions = tasks
    .filter(
      task =>
        !task.complete &&
        task.reminderLatitude != null &&
        task.reminderLongitude != null,
    )
    .slice(0, MAX_REGIONS)
    .map(task => ({
      identifier: task.name,
      latitude: task.reminderLatitude,
      longitude: task.reminderLongitude,
      // A radius under ~100m is unreliable in practice: phone GPS is not that
      // precise, and the OS uses cell and wifi positioning to save battery.
      radius: Math.max(task.reminderRadius ?? 200, 100),
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

  const alreadyRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);

  if (regions.length === 0) {
    if (alreadyRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    return 0;
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  return regions.length;
}

export async function stopWatching() {
  if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
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
