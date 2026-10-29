import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const TOKEN_KEY = 'caltal_token';
const USER_KEY = 'caltal_user';

// The phone has no localStorage. SecureStore keeps values in the iOS Keychain
// and the Android Keystore — encrypted, and private to this app. Everything
// here is async, which localStorage was not.
export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function storeSession(response) {
  await SecureStore.setItemAsync(TOKEN_KEY, response.token);
  await storeUser({ name: response.name, email: response.email });
}

async function storeUser(user) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// The website can reload the page when a session dies. A phone app can't, so
// App.js registers a function here that sends the person back to sign-in.
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function request(path, options = {}) {
  const token = await getToken();

  // A form (a voice note upload) gets its Content-Type from fetch itself, with
  // the boundary between its parts; everything else here is JSON.
  const isForm = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // A 401 with a token means the session is over. Without one, it's just a
  // wrong email or password at sign-in, and the server's message says so.
  if (response.status === 401 && token) {
    // Only end the session if it's still the one this request used. A request
    // sent just before a password change carries the old token; its 401 must
    // not throw away the fresh token saved since.
    if ((await getToken()) === token) {
      await clearSession();
      onSessionExpired();
    }
    throw new Error('Your session has ended. Please sign in again.');
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ---- Signing in and out ----

// Signing up never signs straight in: the answer has confirmEmail set, and
// the next step is the code emailed to that address (confirmWithCode below).
export function register(email, password, name) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

// The six-digit code from the email, with the same email and password. Signs
// in.
export async function confirmWithCode(email, password, code) {
  const result = await request('/auth/confirm-email', {
    method: 'POST',
    body: JSON.stringify({ email, password, code }),
  });

  await storeSession(result);
  return result;
}

export function resendCode(email, password) {
  return request('/auth/resend-code', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// The ID token Google's account picker hands the app (see src/google.js). The
// server checks it with Google and replies with a normal Caltal session, the
// same as for the website's Google button.
export async function loginWithGoogle(idToken) {
  const result = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential: idToken }),
  });

  await storeSession(result);
  return result;
}

// For an account whose email isn't confirmed yet, the answer has confirmEmail
// set instead of a session, and a code is on its way
export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.token) {
    await storeSession(result);
  }
  return result;
}

// Emails a reset link if the address has an account. The server answers the
// same either way, so this can't be used to find out who has signed up.
export function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// Tells the server to revoke every token this account holds, then forgets the
// session here. The local half runs even if the server can't be reached.
// Swaps the stored token for a fresh one. A sign-in lasts 30 days from when
// its token was issued (jwt.expiry-hours on the server), so doing this
// whenever Caltal is opened keeps anyone who uses it signed in, and their
// reminders set. An already-expired token gets a 401, which ends the session
// as usual (see request above).
export async function refreshSession() {
  const token = await getToken();
  if (!token) {
    return null;
  }
  const result = await request('/auth/refresh', { method: 'POST' });
  // Signed out while this was on its way: don't bring the session back
  if ((await getToken()) === token) {
    await storeSession(result);
  }
  return result;
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // Offline or already expired: signing out locally is still the right result.
  } finally {
    await clearSession();
  }
}

// ---- Tasks ----

export function getAllTasks() {
  return request('/tasks');
}

export function getTasksOnDate(date) {
  return request(`/tasks/on?date=${date}`);
}

export function getNearbyTasks(latitude, longitude) {
  return request(`/tasks/nearby?lat=${latitude}&lon=${longitude}`);
}

export function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function updateTask(id, task) {
  return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) });
}

export function completeTask(id) {
  return request(`/tasks/${id}/complete`, { method: 'POST' });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}

// ---- Voice notes (one per task) ----

// Sends a recording made on this phone. It replaces the task's note if it had
// one. Answers with the task, whose voiceNoteMs is now the note's length.
export function uploadVoiceNote(taskId, fileUri, durationMs) {
  const body = new FormData();
  // React Native's way of attaching a file: its address on the phone, plus a
  // name and type for the upload
  body.append('audio', { uri: fileUri, name: 'voice-note.m4a', type: 'audio/mp4' });
  body.append('durationMs', String(Math.round(durationMs)));
  return request(`/tasks/${taskId}/voice-note`, { method: 'PUT', body });
}

export function deleteVoiceNote(taskId) {
  return request(`/tasks/${taskId}/voice-note`, { method: 'DELETE' });
}

// What the audio player needs to play a task's note straight from the server:
// the address, and the sign-in token to show for it. `version` changes when
// the note does, so a re-recorded note is never played from an old copy.
export async function voiceNoteSource(taskId, version) {
  const token = await getToken();
  return {
    uri: `${API_URL}/tasks/${taskId}/voice-note?v=${version}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

// ---- The signed-in account ----

export function getMe() {
  return request('/me');
}

// Emails (another) link to confirm the account's address. The link opens
// the website, which asks the person to sign in and then confirms it.
export function sendConfirmationEmail() {
  return request('/me/verify-email', { method: 'POST' });
}

export async function updateName(name) {
  const me = await request('/me', { method: 'PUT', body: JSON.stringify({ name }) });
  await storeUser({ name: me.name, email: me.email });
  return me;
}

// Changing the password ends every session, this one included, so the server
// sends back a fresh token to keep this phone signed in.
export async function changePassword(currentPassword, newPassword) {
  const result = await request('/me/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  await storeSession(result);
  return result;
}

export async function deleteAccount(password) {
  await request('/me', {
    method: 'DELETE',
    body: password ? JSON.stringify({ password }) : undefined,
  });

  await clearSession();
}

// ---- Saved places (Home, Work…) ----

export function getPlaces() {
  return request('/places');
}

export function createPlace(place) {
  return request('/places', { method: 'POST', body: JSON.stringify(place) });
}

export function updatePlace(id, place) {
  return request(`/places/${id}`, { method: 'PUT', body: JSON.stringify(place) });
}

export function deletePlace(id) {
  return request(`/places/${id}`, { method: 'DELETE' });
}
