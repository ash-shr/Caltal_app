import { useState } from 'react';
import { format } from 'date-fns';
import MapPicker, { TRIGGER_COLOUR } from './MapPicker';
import RadiusSlider from './RadiusSlider';

const REMINDER_TYPES = [
  { value: 'LOCATION', label: 'Place' },
  { value: 'TIME', label: 'Time' },
  { value: 'BOTH', label: 'Both' },
];

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm ' +
  'text-stone-800 placeholder:text-stone-400 transition-colors duration-200 ' +
  'focus:border-stone-400 focus:outline-none';

// One form, two jobs: creating a task and editing one. `task` is undefined when
// creating. `onSubmit` is handed the finished payload and must return a promise.
//
// The details stay folded away until there is something to attach them to, so
// adding a quick task is one field and one button.
function TaskForm({ task, dueDate, submitLabel, showDate = false, onSubmit }) {
  const editing = Boolean(task);

  const [name, setName] = useState(task?.name ?? '');
  const [open, setOpen] = useState(editing);
  const [mapOpen, setMapOpen] = useState(false);

  const [reminderType, setReminderType] = useState(task?.reminderType ?? 'LOCATION');
  const [latitude, setLatitude] = useState(task?.latitude ?? null);
  const [longitude, setLongitude] = useState(task?.longitude ?? null);
  const [radius, setRadius] = useState(task?.radius ?? 200);
  const [remindAt, setRemindAt] = useState(task?.remindAt?.slice(0, 5) ?? '');
  const [date, setDate] = useState(format(dueDate, 'yyyy-MM-dd'));

  // The optional second place: where to be reminded, when that isn't the task.
  const [elsewhere, setElsewhere] = useState(task?.triggerLatitude != null);
  const [triggerLatitude, setTriggerLatitude] = useState(task?.triggerLatitude ?? null);
  const [triggerLongitude, setTriggerLongitude] = useState(task?.triggerLongitude ?? null);
  const [triggerRadius, setTriggerRadius] = useState(task?.triggerRadius ?? 300);

  // Which pin a click on the map moves
  const [picking, setPicking] = useState('task');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const needsLocation = reminderType === 'LOCATION' || reminderType === 'BOTH';
  const needsTime = reminderType === 'TIME' || reminderType === 'BOTH';

  const handlePick = (lat, lon) => {
    if (picking === 'trigger') {
      setTriggerLatitude(lat);
      setTriggerLongitude(lon);
    } else {
      setLatitude(lat);
      setLongitude(lon);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (!open) {
      setOpen(true);
      return;
    }
    if (needsLocation && (latitude === null || longitude === null)) {
      setError('Pick a place on the map.');
      return;
    }
    if (needsTime && !remindAt) {
      setError('Choose a time.');
      return;
    }
    if (elsewhere && needsLocation && triggerLatitude === null) {
      setError('Pick the place you want to be reminded at.');
      return;
    }

    // The backend rejects a task carrying fields its type does not allow,
    // so only send the ones this type needs.
    const payload = {
      name: name.trim(),
      dueDate: showDate ? date : format(dueDate, 'yyyy-MM-dd'),
      reminderType,
    };

    if (needsLocation) {
      payload.latitude = latitude;
      payload.longitude = longitude;
      payload.radius = radius;

      if (elsewhere && triggerLatitude !== null) {
        payload.triggerLatitude = triggerLatitude;
        payload.triggerLongitude = triggerLongitude;
        payload.triggerRadius = triggerRadius;
      }
    }

    if (needsTime) {
      payload.remindAt = remindAt;
    }

    setBusy(true);

    onSubmit(payload)
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        className={inputClass}
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={() => setOpen(true)}
        maxLength={255}
        placeholder="What needs doing?"
      />

      {/* Everything below folds away until the task has a name to attach to */}
      <div
        className={
          'grid transition-all duration-500 ease-out ' +
          (open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')
        }
      >
        <div className="overflow-hidden">
          <div className="space-y-3 pt-1">

            {showDate && (
              <div>
                <label className="mb-1.5 block text-xs text-stone-500">Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            )}

            <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
              {REMINDER_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value)}
                  className={
                    'rounded-lg px-4 py-1.5 text-sm transition-all duration-200 ' +
                    (reminderType === type.value
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-500 hover:text-stone-800')
                  }
                >
                  {type.label}
                </button>
              ))}
            </div>

            {needsTime && (
              <div>
                <label className="mb-1.5 block text-xs text-stone-500">Remind me at</label>
                <input
                  type="time"
                  className={inputClass}
                  value={remindAt}
                  onChange={e => setRemindAt(e.target.value)}
                />
              </div>
            )}

            {needsLocation && (
              <div className="space-y-3">
                <MapPicker
                  task={{ latitude, longitude, radius }}
                  trigger={
                    elsewhere && triggerLatitude !== null
                      ? {
                          latitude: triggerLatitude,
                          longitude: triggerLongitude,
                          radius: triggerRadius,
                        }
                      : null
                  }
                  onPick={handlePick}
                  expanded={mapOpen}
                  onExpand={() => setMapOpen(true)}
                />

                {!mapOpen ? (
                  <p className="text-xs leading-relaxed text-stone-400">
                    Tap the map to choose where this task lives. You&rsquo;ll be
                    reminded when you come within range of it.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {elsewhere && (
                      <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setPicking('task')}
                          className={
                            'rounded-lg px-3 py-1.5 text-xs transition-all duration-200 ' +
                            (picking === 'task'
                              ? 'bg-stone-800 text-white'
                              : 'text-stone-500 hover:text-stone-800')
                          }
                        >
                          Setting the task
                        </button>
                        <button
                          type="button"
                          onClick={() => setPicking('trigger')}
                          className={
                            'rounded-lg px-3 py-1.5 text-xs transition-all duration-200 ' +
                            (picking === 'trigger'
                              ? 'text-white'
                              : 'text-stone-500 hover:text-stone-800')
                          }
                          style={
                            picking === 'trigger'
                              ? { backgroundColor: TRIGGER_COLOUR }
                              : undefined
                          }
                        >
                          Setting the reminder
                        </button>
                      </div>
                    )}

                    <RadiusSlider
                      label={picking === 'trigger' ? 'Reminder radius' : 'Task radius'}
                      value={picking === 'trigger' ? triggerRadius : radius}
                      onChange={picking === 'trigger' ? setTriggerRadius : setRadius}
                    />

                    <label className="flex cursor-pointer items-start gap-2.5 text-xs text-stone-500">
                      <input
                        type="checkbox"
                        checked={elsewhere}
                        onChange={e => {
                          setElsewhere(e.target.checked);
                          setPicking(e.target.checked ? 'trigger' : 'task');
                        }}
                        className="mt-0.5 h-3.5 w-3.5 rounded accent-stone-800"
                      />
                      <span className="leading-relaxed">
                        Remind me somewhere else — useful when the task is
                        somewhere you only pass occasionally, and you&rsquo;d
                        rather hear about it on your way.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white
                   transition-all duration-200 hover:bg-stone-700 active:scale-[0.98]
                   disabled:opacity-50"
      >
        {busy ? 'Saving…' : submitLabel}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default TaskForm;
