// Point at a local backend during development by creating frontend/.env.local
// containing: VITE_API_URL=http://localhost:8080/api
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://caltal.fly.dev/api';

const TOKEN_KEY = 'caltal_token';
const USER_KEY = 'caltal_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function storeSession(response) {
  localStorage.setItem(TOKEN_KEY, response.token);
  storeUser(response);
}

function storeUser({ name, email }) {
  localStorage.setItem(USER_KEY, JSON.stringify({ name, email }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(url, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  // 204 No Content has no body; parsing it as JSON would throw.
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

  storeSession(result);
  return result;
}

// `credential` is the ID token Google's button hands us. The server checks it
// with Google and replies with a normal Caltal session.
export async function loginWithGoogle(credential) {
  const result = await request(`${BASE_URL}/auth/google`, {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

  storeSession(result);
  return result;
}

export async function login(email, password) {
  const result = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  storeSession(result);
  return result;
}

// Always "done": the server doesn't say whether the email has an account.
export function requestPasswordReset(email) {
  return request(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// `token` is the secret from the emailed link. A successful reset also signs
// this browser in.
export async function resetPassword(token, password) {
  const result = await request(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

  storeSession(result);
  return result;
}

export function getMe() {
  return request(`${BASE_URL}/me`);
}

export async function updateName(name) {
  const me = await request(`${BASE_URL}/me`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });

  storeUser(me);
  return me;
}

// Changing the password ends every session, this one included, so the server
// sends back a fresh token to keep this browser signed in.
export async function changePassword(currentPassword, newPassword) {
  const result = await request(`${BASE_URL}/me/password`, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  storeSession(result);
  return result;
}

// Google-only accounts have no password, so `password` may be null
export async function deleteAccount(password) {
  await request(`${BASE_URL}/me`, {
    method: 'DELETE',
    body: password ? JSON.stringify({ password }) : undefined,
  });

  clearSession();
}

export function sendConfirmationEmail() {
  return request(`${BASE_URL}/me/verify-email`, { method: 'POST' });
}

export function confirmEmail(token) {
  return request(`${BASE_URL}/me/verify-email/confirm`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function getAllTasks() {
  return request(`${BASE_URL}/tasks`);
}

export function createTask(task) {
  return request(`${BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export function completeTask(id) {
  return request(`${BASE_URL}/tasks/${id}/complete`, { method: 'POST' });
}

export function deleteTask(id) {
  return request(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' });
}

export function updateTask(id, task) {
  return request(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
}

// A task's voice note (recorded in the app) as a Blob the page can play. A
// plain <audio src> can't send the sign-in token, so it's fetched here first.
export async function getVoiceNote(taskId) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/voice-note`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401) {
    clearSession();
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!response.ok) {
    throw new Error("Couldn't load the voice note");
  }
  return response.blob();
}

export function deleteVoiceNote(taskId) {
  return request(`${BASE_URL}/tasks/${taskId}/voice-note`, { method: 'DELETE' });
}

export function getNearbyTasks(latitude, longitude) {
  return request(`${BASE_URL}/tasks/nearby?lat=${latitude}&lon=${longitude}`);
}

// Saved places (Home, Work…)
export function getPlaces() {
  return request(`${BASE_URL}/places`);
}

export function createPlace(place) {
  return request(`${BASE_URL}/places`, { method: 'POST', body: JSON.stringify(place) });
}

export function updatePlace(id, place) {
  return request(`${BASE_URL}/places/${id}`, { method: 'PUT', body: JSON.stringify(place) });
}

export function deletePlace(id) {
  return request(`${BASE_URL}/places/${id}`, { method: 'DELETE' });
}

// Revokes every token this account holds, on every device. The local copy is
// cleared regardless — if the server can't be reached, the user still expects
// to be signed out on this screen.
export async function logout() {
  try {
    await request(`${BASE_URL}/auth/logout`, { method: 'POST' });
  } finally {
    clearSession();
  }
}
