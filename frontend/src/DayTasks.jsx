import { useState } from 'react';
import Icon from './icons';
import { shortTime } from './dates';
import { hasPlace } from './useTasks';

function describe(task) {
  const parts = [];
  if (task.remindAt) {
    parts.push(shortTime(task.remindAt));
  }
  if (hasPlace(task)) {
    parts.push(`${task.radius} m radius`);
  }
  if (task.triggerLatitude != null) {
    parts.push('reminds you elsewhere');
  }
  return parts.join(' · ');
}

// The tasks on one day. Finished ones sink to the bottom.
//   touch  a phone or tablet, where the map is pressed and held, not right-clicked
function DayTasks({ tasks, onOpen, onComplete, touch }) {
  // Ids being marked done right now, so a row can't be clicked twice
  const [busy, setBusy] = useState([]);

  if (tasks.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-stone-400">
        {`Nothing on this day. Add a task with +, or ${
          touch ? 'press and hold' : 'right-click'
        } anywhere on the map to start one there.`}
      </p>
    );
  }

  const markDone = task => {
    setBusy(ids => [...ids, task.id]);
    onComplete(task)
      .catch(() => {
        // The list reloads either way; a failed tick just stays unticked
      })
      .finally(() => setBusy(ids => ids.filter(id => id !== task.id)));
  };

  const ordered = [...tasks].sort((a, b) => Number(a.complete) - Number(b.complete));

  return (
    <ul className="space-y-2">
      {ordered.map(task => (
        <li
          key={task.id}
          className={
            'flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 ' +
            'transition-all duration-200 hover:ring-stone-300 ' +
            (busy.includes(task.id) ? 'opacity-50' : '')
          }
        >
          <button
            type="button"
            onClick={() => markDone(task)}
            disabled={task.complete || busy.includes(task.id)}
            aria-label={task.complete ? `${task.name} is done` : `Mark ${task.name} as done`}
            className={
              'flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ' +
              (task.complete
                ? 'border-stone-300 bg-stone-300 text-white'
                : 'border-caltal text-transparent hover:bg-caltal-soft active:scale-90')
            }
          >
            <Icon name="check" size={14} strokeWidth={2.5} />
          </button>

          <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
            <span
              className={
                'block truncate text-[15px] ' +
                (task.complete ? 'text-stone-400 line-through' : 'text-stone-800')
              }
            >
              {task.name}
            </span>
            {describe(task) !== '' && (
              <span className="mt-0.5 block text-xs text-stone-400">{describe(task)}</span>
            )}
          </button>

          {/* What will remind you: a place, a time, or nothing for a plain to-do */}
          {(hasPlace(task) || task.remindAt) && (
            <Icon
              name={hasPlace(task) ? 'location' : 'time'}
              size={18}
              className="flex-none text-stone-300"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default DayTasks;
