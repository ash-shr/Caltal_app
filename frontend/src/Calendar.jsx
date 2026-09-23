import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/style.css';
import { getTasksOnDate } from './api';

function Calendar({ selected, onSelect, refreshKey }) {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!selected) return;

        getTasksOnDate(format(selected, 'yyyy-MM-dd'))
            .then(setTasks)
            .catch(err => setError(err.message));
    }, [selected, refreshKey]);

    return (
        <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <DayPicker
                    mode="single"
                    selected={selected}
                    onSelect={onSelect}
                    weekStartsOn={1}
                    // Nothing exists before launch, so don't let users navigate there
                    startMonth={new Date(2026, 0)}
                    classNames={{
                        months: 'relative',
                        month_caption: 'text-sm font-medium text-stone-700 mb-3 px-1',
                        weekday: 'text-xs font-normal text-stone-400 pb-2',
                        day: 'text-sm text-stone-600',
                        day_button:
                            'w-9 h-9 rounded-full transition-colors duration-200 hover:bg-stone-100',
                        selected: '[&>button]:bg-stone-800 [&>button]:text-white [&>button]:hover:bg-stone-800',
                        today: 'font-medium text-stone-900',
                        outside: 'text-stone-300',
                        nav: 'absolute top-0 right-0 flex gap-1',
                        button_previous: 'w-7 h-7 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors',
                        button_next: 'w-7 h-7 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors',
                    }}
                />
            </div>

            <div className="mt-8">
                <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">
                    {selected && format(selected, 'EEEE d MMMM')}
                </h2>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                {tasks.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-400">Nothing scheduled.</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {tasks.map(task => (
                            <li
                                key={task.id}
                                className="rounded-xl border border-stone-200 bg-white px-4 py-3
                           transition-shadow duration-200 hover:shadow-sm"
                            >
                                <span className="text-sm text-stone-800">{task.name}</span>
                                <span className="ml-2 text-xs text-stone-400">{task.radius}m</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Calendar;