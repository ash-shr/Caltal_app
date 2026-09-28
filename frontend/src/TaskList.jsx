import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getTasksOnDate, completeTask, deleteTask } from './api';
import Loading from './Loading';

// Shows whatever is scheduled on the selected day, and lets a task be completed
// or removed. onChanged tells App something happened, so the calendar dots and
// this list both refetch.
function TaskList({ selected, refreshKey, onChanged, onOpen }) {
    // What we're currently showing, tagged with the request it came from.
    const [loaded, setLoaded] = useState({ key: null, tasks: [] });
    const [error, setError] = useState('');
    // Ids with a request in flight, so a row can't be double-clicked.
    const [busy, setBusy] = useState([]);

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

    const run = (id, action) => {
        setBusy(ids => [...ids, id]);
        setError('');

        action(id)
            .then(() => onChanged())
            .catch(err => setError(err.message))
            .finally(() => setBusy(ids => ids.filter(each => each !== id)));
    };

    return (
        <div>
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {selected && format(selected, 'EEEE d MMMM')}
            </h2>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {loading ? (
                <Loading size={56} />
            ) : loaded.tasks.length === 0 ? (
                <p className="mt-4 text-sm text-stone-400">Nothing scheduled.</p>
            ) : (
                <ul className="mt-4 space-y-2">
                    {loaded.tasks.map(task => (
                        <li
                            key={task.id}
                            className={
                                'group flex items-start gap-3 rounded-2xl border border-stone-200 ' +
                                'bg-white px-4 py-3 transition-all duration-200 ' +
                                'hover:border-stone-300 hover:shadow-sm ' +
                                (busy.includes(task.id) ? 'opacity-50' : '')
                            }
                        >
                            <button
                                type="button"
                                aria-label={task.complete ? 'Completed' : 'Mark complete'}
                                disabled={task.complete || busy.includes(task.id)}
                                onClick={() => run(task.id, completeTask)}
                                className={
                                    'mt-0.5 flex h-5 w-5 flex-none items-center justify-center ' +
                                    'rounded-full border transition-all duration-200 ' +
                                    (task.complete
                                        ? 'border-stone-800 bg-stone-800 text-white'
                                        : 'border-stone-300 hover:border-stone-500 active:scale-90')
                                }
                            >
                                {task.complete && (
                                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                                        <path
                                            d="M2.5 6.5 5 9l4.5-5.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.75"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </button>

                            <div className="min-w-0 flex-1">
                                <button
                                    type="button"
                                    onClick={() => onOpen(task)}
                                    className={
                                        'block w-full truncate text-left text-sm transition-colors duration-200 ' +
                                        (task.complete
                                            ? 'text-stone-400 line-through'
                                            : 'text-stone-800 hover:text-stone-950')
                                    }
                                >
                                    {task.name}
                                </button>

                                <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                                    {task.remindAt && <span>{task.remindAt.slice(0, 5)}</span>}
                                    {task.radius != null && <span>{task.radius}m radius</span>}
                                </div>
                            </div>

                            <button
                                type="button"
                                aria-label="Delete task"
                                disabled={busy.includes(task.id)}
                                onClick={() => run(task.id, deleteTask)}
                                className="flex-none rounded-lg p-1 text-stone-300 opacity-0
                                           transition-all duration-200 hover:text-stone-600
                                           focus:opacity-100 group-hover:opacity-100"
                            >
                                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true">
                                    <path
                                        d="M3 3l8 8M11 3l-8 8"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TaskList;
