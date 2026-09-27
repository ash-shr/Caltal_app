import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { parseISO } from 'date-fns';
import 'react-day-picker/style.css';
import { getAllTasks } from './api';

// A dot under the number on any day that has something on it. The dot takes its
// colour from the day's text (bg-current), so it turns white on the selected day
// without needing a second rule.
const DOT =
    '[&>button]:after:absolute [&>button]:after:bottom-1.5 ' +
    '[&>button]:after:left-1/2 [&>button]:after:-translate-x-1/2 ' +
    '[&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full ' +
    '[&>button]:after:bg-current [&>button]:after:opacity-50 ' +
    '[&>button]:after:content-[""]';

// The calendar is the centre of the app: it picks a date and shows where work
// exists. What lives on a given date is TaskList's job.
function Calendar({ selected, onSelect, refreshKey }) {
    const [daysWithTasks, setDaysWithTasks] = useState([]);

    useEffect(() => {
        let current = true;

        getAllTasks()
            .then(tasks => {
                if (!current) return;
                setDaysWithTasks(tasks.map(task => parseISO(task.dueDate)));
            })
            .catch(() => {
                // A missing dot is not worth an error message; the day still opens.
                if (current) setDaysWithTasks([]);
            });

        return () => {
            current = false;
        };
    }, [refreshKey]);

    return (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <DayPicker
                mode="single"
                required
                selected={selected}
                onSelect={onSelect}
                weekStartsOn={1}
                // Nothing exists before launch, so don't let users navigate there
                startMonth={new Date(2026, 0)}
                modifiers={{ hasTasks: daysWithTasks }}
                modifiersClassNames={{ hasTasks: DOT }}
                classNames={{
                    months: 'relative w-full',
                    month: 'w-full',
                    month_caption:
                        'text-lg font-medium tracking-tight text-stone-800 mb-6 px-1',
                    month_grid: 'w-full border-collapse',
                    weekdays: 'mb-2',
                    weekday:
                        'text-xs font-normal uppercase tracking-widest text-stone-400 pb-3',
                    day: 'p-0.5 text-center align-middle',
                    day_button:
                        'relative mx-auto flex h-12 w-12 items-center justify-center ' +
                        'rounded-full text-base text-stone-600 transition-all duration-200 ' +
                        'hover:bg-stone-100 active:scale-95',
                    selected:
                        '[&>button]:bg-stone-800 [&>button]:text-white ' +
                        '[&>button]:hover:bg-stone-800',
                    today: '[&>button]:font-semibold [&>button]:text-stone-900',
                    outside: '[&>button]:text-stone-300',
                    nav: 'absolute top-0 right-0 flex gap-1',
                    button_previous:
                        'flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 ' +
                        'transition-colors hover:bg-stone-100 hover:text-stone-700',
                    button_next:
                        'flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 ' +
                        'transition-colors hover:bg-stone-100 hover:text-stone-700',
                }}
            />
        </div>
    );
}

export default Calendar;
