import { Platform } from 'react-native';
import CaltalAlarm from '../modules/caltal-alarm';

// Reminders that ring like an alarm: a full-screen screen, over the lock
// screen, that keeps ringing until it's answered, snoozed or dismissed. This
// is Caltal's own Android code (modules/caltal-alarm). iPhones don't have it,
// so everything here does nothing there and ordinary notifications are used.
export const canRing = Platform.OS === 'android' && CaltalAlarm != null;

// Android 14 and later: whether the person has allowed Caltal to fill the
// screen. Without it reminders still ring, as a pop-up notification.
export function fullScreenAllowed() {
  return canRing ? CaltalAlarm.canRingFullScreen() : false;
}

export function openFullScreenSettings() {
  if (canRing) {
    CaltalAlarm.openFullScreenSettings();
  }
}

// What the ringing screen shows for a task. Answering opens the task and
// plays its voice note if it has one.
export function ringingAlarm(task, { id, at, body }) {
  return {
    id,
    at,
    title: task.name,
    body,
    taskId: task.id,
    hasVoiceNote: task.voiceNoteMs != null,
  };
}

// Swaps every scheduled ringing reminder for these. Snoozed ones carry on.
export async function replaceRinging(alarms) {
  if (canRing) {
    await CaltalAlarm.replaceScheduled(alarms);
  }
}

export async function scheduleRinging(alarm) {
  if (canRing) {
    await CaltalAlarm.schedule(alarm);
  }
}

// All of them, snoozes too: ringing switched off, or signing out
export async function cancelRinging() {
  if (canRing) {
    await CaltalAlarm.cancelAll();
  }
}

export async function ringNow(alarm) {
  if (canRing) {
    await CaltalAlarm.ringNow(alarm);
  }
}
