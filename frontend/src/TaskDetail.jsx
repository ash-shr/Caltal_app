import { useState } from 'react';
import Icon from './icons';
import { longDay, shortTime } from './dates';
import { hasPlace } from './useTasks';
import {
  buttonClass,
  dangerButtonClass,
  quietDangerButtonClass,
  secondaryButtonClass,
} from './ui';

const TYPE_LABELS = {
  LOCATION: 'Reminds you at a place',
  TIME: 'Reminds you at a time',
  BOTH: 'Reminds you at a place and a time',
  NONE: 'No reminder',
};

function Line({ icon, children }) {
  return (
    <div className="flex items-start gap-3 text-sm text-stone-600">
      <Icon name={icon} size={18} className="mt-px flex-none text-stone-400" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

// One task in full, shown in the panel in place of the calendar.
function TaskDetail({ task, onBack, onEdit, onComplete, onDelete, onShowOnMap }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  // Deleting can't be undone, so it takes a second click to confirm
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const run = async (which, action) => {
    setBusy(which);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-800"
      >
        <Icon name="back" size={16} />
        Calendar
      </button>

      <h2
        className={
          'text-xl font-semibold tracking-tight ' +
          (task.complete ? 'text-stone-400 line-through' : 'text-stone-800')
        }
      >
        {task.name}
      </h2>

      <div className="space-y-3">
        <Line icon="calendar">{longDay(task.dueDate)}</Line>
        <Line icon="bell">{TYPE_LABELS[task.reminderType] ?? 'Reminder'}</Line>
        {task.remindAt && <Line icon="time">At {shortTime(task.remindAt)}</Line>}
        {hasPlace(task) && (
          <Line icon="location">
            {`Within ${task.radius} m of its pin · `}
            <button
              type="button"
              onClick={onShowOnMap}
              className="text-caltal underline-offset-2 hover:underline"
            >
              show on map
            </button>
          </Line>
        )}
        {task.triggerLatitude != null && (
          <Line icon="navigate">Reminds you {task.triggerRadius} m from a second place</Line>
        )}
        {task.complete && <Line icon="check">Done</Line>}
      </div>

      <div className="space-y-2">
        <button type="button" onClick={onEdit} className={buttonClass}>
          Edit
        </button>

        {!task.complete && (
          <button
            type="button"
            onClick={() => run('complete', onComplete)}
            disabled={busy !== ''}
            className={secondaryButtonClass}
          >
            {busy === 'complete' ? 'Marking…' : 'Mark as done'}
          </button>
        )}

        {confirmingDelete ? (
          <div className="space-y-2 rounded-2xl bg-red-50 p-3">
            <p className="text-sm text-red-700">{`Delete "${task.name}" for good?`}</p>
            <button
              type="button"
              onClick={() => run('delete', onDelete)}
              disabled={busy !== ''}
              className={dangerButtonClass}
            >
              {busy === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="w-full py-1 text-sm text-stone-500 hover:text-stone-800"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={quietDangerButtonClass}
          >
            Delete task
          </button>
        )}
      </div>

      {error !== '' && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default TaskDetail;
