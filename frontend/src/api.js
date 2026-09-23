const BASE_URL = 'https://caltal.fly.dev/api/tasks';

async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    return response.json();
}

export function getAllTasks() {
    return request(BASE_URL);
}

export function getTasksOnDate(date) {
    return request(`${BASE_URL}/on?date=${date}`);
}

export function createTask(task) {
    return request(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(task),
    });
}