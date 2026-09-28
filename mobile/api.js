import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://caltal.fly.dev/api';

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
  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify({ name: response.name, email: response.email }),
  );
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

async function request(url, options = {}) {
  const token = await getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    await clearSession();
    throw new Error('Session expired');
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

export async function register(email, password, name) {
  const result = await request(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  await storeSession(result);
  return result;
}

export async function login(email, password) {
  const result = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  await storeSession(result);
  return result;
}

export function getTasksOnDate(date) {
  return request(`${BASE_URL}/tasks/on?date=${date}`);
}

export function getNearbyTasks(latitude, longitude) {
  return request(`${BASE_URL}/tasks/nearby?lat=${latitude}&lon=${longitude}`);
}

export function getAllTasks() {
  return request(`${BASE_URL}/tasks`);
}
