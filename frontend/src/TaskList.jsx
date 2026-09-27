import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getTasksOnDate } from './api';

// Shows whatever is scheduled on the selected day. Refetches when the day
// changes, or when refreshKey is bumped after a task is added.
function TaskList({ selected, refreshKey }) {
    // What we're currently showing, tagged with the request it came from.
    const [loaded, setLoaded] = useState({ key: null, tasks: [] });
    const [error, setError] = useState('');

    // The request the UI *should* be showing right now.
    const key = selected ? `${format(selected, 'yyyy-MM-dd')}#${refreshKey}` : null;

    // If what we have isn't what we want, we're still waiting. Derived rather
    // than stored, so there's no setState in the effect body.
    const loading = loaded.key !== key;

    useEffect(() => {
        if (!key) return;

        let current = true;

        getTasksOnDate(key.split('#')[0])
            .then(tasks => {
                // A slow earlier request must not overwrite a newer day's tasks
                if (!current) return;
                setLoaded({ key, tasks });
                setError('');
            })
            .catch(err => {
                if (current) setError(err.message);
            });

        return () => {
            current = false;
        };
    }, [key]);

    return (
        <div>
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {selected && format(selected, 'EEEE d MMMM')}
            </h2>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {loading ? (
                <p className="mt-4 text-sm text-stone-300">Loading…</p>
            ) : loaded.tasks.length === 0 ? (
                <p className="mt-4 text-sm text-stone-400">Nothing scheduled.</p>
            ) : (
                <ul className="mt-4 space-y-2">
                    {loaded.tasks.map(task => (
                        <li
                            key={task.id}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3
                                       transition-all duration-200 hover:border-stone-300 hover:shadow-sm"
                        >
                            <p className="text-sm text-stone-800">{task.name}</p>

                            <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                                {task.remindAt && <span>{task.remindAt.slice(0, 5)}</span>}
                                {task.radius != null && <span>{task.radius}m radius</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TaskList;
