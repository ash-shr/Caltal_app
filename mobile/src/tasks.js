import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as api from './api';
import { syncReminders } from './reminders';
import { useSettings } from './settings';

// Every screen works from one list of tasks: the map's pins, the calendar's
// dots and the day's list are all views of it. Loading it once and sharing it
// through context means they can never disagree with each other.
const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const { settings, loaded: settingsLoaded } = useSettings();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The latest settings, readable from inside callbacks without making every
  // callback depend on them (and re-create itself whenever a setting changes).
  // Declared before the effect that loads tasks, so it has already run when
  // that one does.
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Loads can overlap (the app coming to the foreground while a task is being
  // saved, say). Each one gets a number, and an answer that arrives after a
  // newer load has started is out of date, so it's ignored.
  const latestLoad = useRef(0);

  const refresh = useCallback(() => {
    latestLoad.current += 1;
    const mine = latestLoad.current;

    return api.getAllTasks().then(
      latest => {
        if (mine === latestLoad.current) {
          setTasks(latest);
          setError('');
          setLoading(false);

          // Tasks go on screen first; reminders are scheduled afterwards
          // without holding the screen up (the first time, that waits for the
          // person to answer the notifications permission prompt).
          syncReminders(latest, () => settingsRef.current);
        }
        return latest;
      },
      failure => {
        if (mine === latestLoad.current) {
          setError(failure.message);
          setLoading(false);
        }
        return null;
      },
    );
  }, []);

  // Load once settings are known, and again whenever reminders are switched on
  // or off, so they get rescheduled.
  useEffect(() => {
    if (settingsLoaded) {
      refresh();
    }
  }, [settingsLoaded, settings.timeReminders, settings.placeReminders, refresh]);

  // Coming back to the app is a good moment to catch up: tasks may have been
  // added on the website in the meantime.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  // Each change goes to the server first; the list is then reloaded from it so
  // what's on screen is always what's actually saved.
  const create = useCallback(
    async payload => {
      const created = await api.createTask(payload);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (id, payload) => {
      const updated = await api.updateTask(id, payload);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const complete = useCallback(
    async id => {
      await api.completeTask(id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async id => {
      await api.deleteTask(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <TasksContext.Provider
      value={{ tasks, loading, error, refresh, create, update, complete, remove }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}

// Tasks only carry a place when they're Place or Both tasks.
export function hasPlace(task) {
  return task.latitude != null && task.longitude != null;
}
