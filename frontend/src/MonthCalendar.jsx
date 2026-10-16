import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { isSameMonth, parseISO, startOfMonth } from 'date-fns';
import 'react-day-picker/style.css';
import { isoDate } from './dates';

// A dot under the number on days with tasks: orange while anything that day
// is still to do, grey once it's all done. The same as the app's calendar.
const DOT =
  '[&>button]:after:absolute [&>button]:after:bottom-1 ' +
  '[&>button]:after:left-1/2 [&>button]:after:-translate-x-1/2 ' +
  '[&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full ' +
  '[&>button]:after:content-[""] ';

const NAV_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 ' +
  'transition-colors hover:bg-stone-200/60 hover:text-stone-700';

// selected: 'YYYY-MM-DD'. marks: { 'YYYY-MM-DD': 'open' | 'done' }
function MonthCalendar({ selected, onSelect, marks }) {
  const selectedDate = parseISO(selected);

  // The month on show. It follows the selected day when that moves to
  // another month (opening a task from the map, say), and otherwise stays
  // wherever the arrows put it. Adjusting state during render is React's own
  // pattern for this: no extra pass, unlike an effect.
  const [month, setMonth] = useState(() => startOfMonth(selectedDate));
  const [followed, setFollowed] = useState(selected);

  if (selected !== followed) {
    setFollowed(selected);
    if (!isSameMonth(selectedDate, month)) {
      setMonth(startOfMonth(selectedDate));
    }
  }

  const days = kind =>
    Object.entries(marks)
      .filter(([, mark]) => mark === kind)
      .map(([day]) => parseISO(day));

  return (
    <DayPicker
      mode="single"
      required
      selected={selectedDate}
      onSelect={day => day && onSelect(isoDate(day))}
      month={month}
      onMonthChange={setMonth}
      weekStartsOn={1}
      // Nothing exists before launch, so don't let people wander back there
      startMonth={new Date(2026, 0)}
      modifiers={{ open: days('open'), done: days('done') }}
      modifiersClassNames={{
        open: `${DOT} [&>button]:after:bg-caltal`,
        done: `${DOT} [&>button]:after:bg-stone-300`,
      }}
      classNames={{
        months: 'relative w-full',
        month: 'w-full',
        month_caption: 'mb-3 flex h-9 items-center px-1 text-base font-semibold tracking-tight text-stone-800',
        month_grid: 'w-full border-collapse',
        weekday: 'pb-2 text-[11px] font-medium uppercase tracking-widest text-stone-400',
        day: 'p-0.5 text-center align-middle',
        day_button:
          'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full ' +
          'text-[15px] text-stone-600 transition-all duration-200 hover:bg-stone-200/60 active:scale-95',
        selected: '[&>button]:bg-stone-800 [&>button]:text-white [&>button]:hover:bg-stone-800',
        today: '[&>button]:font-semibold [&>button]:text-caltal',
        outside: '[&>button]:text-stone-300',
        nav: 'absolute right-0 top-0 flex gap-1',
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        chevron: 'h-4 w-4 fill-current',
      }}
    />
  );
}

export default MonthCalendar;
