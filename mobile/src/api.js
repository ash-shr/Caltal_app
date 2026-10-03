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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

export async function register(email, password, name) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  await storeSession(result);
  return result;
}

export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  await storeSession(result);
  return result;
}

// Tells the server to revoke every token this account holds, then forgets the
// session here. The local half runs even if the server can't be reached.
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

// ---- The signed-in account ----

export function getMe() {
  return request('/me');
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
