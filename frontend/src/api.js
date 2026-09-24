const BASE_URL = 'https://caltal.fly.dev/api';

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
  localStorage.setItem(USER_KEY, JSON.stringify({
    name: response.name,
    email: response.email,
  }));
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

export async function login(email, password) {
  const result = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  storeSession(result);
  return result;
}

export function getAllTasks() {
  return request(`${BASE_URL}/tasks`);
}

export function getTasksOnDate(date) {
  return request(`${BASE_URL}/tasks/on?date=${date}`);
}

export function createTask(task) {
  return request(`${BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
}