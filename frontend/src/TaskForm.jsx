import { useState } from 'react';
import { format } from 'date-fns';
import MapPicker from './MapPicker';

// The three reminder kinds the backend accepts, with the labels we show.
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
function TaskForm({ task, dueDate, submitLabel, showDate = false, onSubmit }) {
  const [name, setName] = useState(task?.name ?? '');
  const [reminderType, setReminderType] = useState(task?.reminderType ?? 'LOCATION');
  const [latitude, setLatitude] = useState(task?.latitude ?? null);
  const [longitude, setLongitude] = useState(task?.longitude ?? null);
  const [radius, setRadius] = useState(task?.radius ?? 200);
  const [remindAt, setRemindAt] = useState(task?.remindAt?.slice(0, 5) ?? '');
  const [date, setDate] = useState(format(dueDate, 'yyyy-MM-dd'));

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const needsLocation = reminderType === 'LOCATION' || reminderType === 'BOTH';
  const needsTime = reminderType === 'TIME' || reminderType === 'BOTH';

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    // Catch the obvious mistakes here rather than making a round trip for them.
    if (!name.trim()) {
      setError('Give it a name.');
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
        placeholder="What needs doing?"
      />

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
        <MapPicker
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          onPick={(lat, lon) => {
            setLatitude(lat);
            setLongitude(lon);
          }}
          onRadiusChange={setRadius}
        />
      )}

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
