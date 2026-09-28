import { useState, useEffect } from 'react';
import { parseISO, format } from 'date-fns';
import TaskForm from './TaskForm';
import { updateTask, completeTask, deleteTask } from './api';

// A slide-over panel showing one task in full, with everything about it editable.
// It stays mounted so it can animate out; `task` going null closes it.
function TaskDetail({ task, onClose, onChanged }) {
    // Hold on to the last task so the panel still has something to draw while it
    // slides away. Adjusting state during render is React's own pattern for
    // deriving from a prop: it re-renders immediately, before anything paints,
    // rather than causing the extra pass an effect would.
    const [lastTask, setLastTask] = useState(task);

    if (task && task !== lastTask) {
        setLastTask(task);
    }

    const shown = task ?? lastTask;

    // Close on Escape, the way any dialog should.
    useEffect(() => {
        if (!task) return;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [task, onClose]);

    const open = Boolean(task);

    const act = (action) => {
        action(shown.id)
            .then(() => {
                onChanged();
                onClose();
            })
            .catch(() => {
                // The panel closing on a failure would hide the problem, so keep it open
            });
    };

    return (
        <>
            {/* Backdrop. pointer-events-none while closed so it can't swallow clicks. */}
            <div
                onClick={onClose}
                className={
                    'fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-sm ' +
                    'transition-opacity duration-300 ' +
                    (open ? 'opacity-100' : 'pointer-events-none opacity-0')
                }
            />

            <aside
                className={
                    'fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto ' +
                    'border-l border-stone-200 bg-stone-50 shadow-xl ' +
                    'transition-transform duration-300 ease-out ' +
                    (open ? 'translate-x-0' : 'translate-x-full')
                }
            >
                {shown && (
                    <div className="px-6 py-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-stone-400">
                                    {format(parseISO(shown.dueDate), 'EEEE d MMMM')}
                                </p>
                                <h2 className="mt-1 text-xl font-medium tracking-tight text-stone-800">
                                    {shown.name}
                                </h2>
                                {shown.complete && (
                                    <p className="mt-1 text-xs text-stone-500">Completed</p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="flex-none rounded-lg p-2 text-stone-400
                                           transition-colors hover:bg-stone-200 hover:text-stone-700"
                            >
                                <svg viewBox="0 0 14 14" className="h-4 w-4" aria-hidden="true">
                                    <path
                                        d="M3 3l8 8M11 3l-8 8"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* key forces a fresh form when a different task is opened */}
                        <TaskForm
                            key={shown.id}
                            task={shown}
                            dueDate={parseISO(shown.dueDate)}
                            showDate
                            submitLabel="Save changes"
                            onSubmit={payload =>
                                updateTask(shown.id, payload).then(() => {
                                    onChanged();
                                    onClose();
                                })
                            }
                        />

                        <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6">
                            {!shown.complete ? (
                                <button
                                    type="button"
                                    onClick={() => act(completeTask)}
                                    className="text-sm text-stone-600 underline underline-offset-4
                                               transition-colors hover:text-stone-900"
                                >
                                    Mark complete
                                </button>
                            ) : (
                                <span className="text-sm text-stone-400">Done</span>
                            )}

                            <button
                                type="button"
                                onClick={() => act(deleteTask)}
                                className="text-sm text-red-600 underline underline-offset-4
                                           transition-colors hover:text-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}

export default TaskDetail;
