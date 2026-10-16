import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api';

// Tasks only carry a place when they're Place or Both tasks
export function hasPlace(task) {
  return task.latitude != null && task.longitude != null;
}

// One list of tasks for the whole page. The map's pins, the calendar's dots
// and the day's list are all views of it, so they can never disagree.
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loads can overlap (coming back to the tab while a task is being saved,
  // say). Each gets a number; an answer that arrives after a newer load has
  // started is out of date, so it's ignored.
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

  useEffect(() => {
    refresh();

    // Coming back to the tab is a good moment to catch up: tasks may have
    // been added on the phone in the meantime.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // Each change goes to the server first, then the list is reloaded from it,
  // so what's on screen is always what's actually saved.
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

  return { tasks, loading, error, refresh, create, update, complete, remove };
}
