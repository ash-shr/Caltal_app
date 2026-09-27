import { useState } from 'react';
import { format } from 'date-fns';
import Calendar from './Calendar';
import MapPicker from './MapPicker';
import Auth from './Auth';
import { createTask, getStoredUser, clearSession } from './api';

// The three reminder kinds the backend accepts, with the labels we show.
const REMINDER_TYPES = [
  { value: 'LOCATION', label: 'Place' },
  { value: 'TIME', label: 'Time' },
  { value: 'BOTH', label: 'Both' },
];

function App() {
  const [user, setUser] = useState(getStoredUser());

  const [selected, setSelected] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const [name, setName] = useState('');
  const [reminderType, setReminderType] = useState('LOCATION');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [radius, setRadius] = useState(200);
  const [remindAt, setRemindAt] = useState('');
  const [error, setError] = useState('');

  const needsLocation = reminderType === 'LOCATION' || reminderType === 'BOTH';
  const needsTime = reminderType === 'TIME' || reminderType === 'BOTH';

  const handleSignOut = () => {
    clearSession();
    setUser(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    // Catch the obvious mistakes here rather than making a round trip for them.
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
    const task = {
      name,
      dueDate: format(selected, 'yyyy-MM-dd'),
      reminderType,
    };

    if (needsLocation) {
      task.latitude = latitude;
      task.longitude = longitude;
      task.radius = radius;
    }

    if (needsTime) {
      task.remindAt = remindAt;
    }

    createTask(task)
      .then(() => {
        setName('');
        setLatitude(null);
        setLongitude(null);
        setRadius(200);
        setRemindAt('');
        setRefreshKey(key => key + 1);
      })
      .catch(err => setError(err.message));
  };

  const inputClass =
    'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm ' +
    'text-stone-800 placeholder:text-stone-400 transition-colors duration-200 ' +
    'focus:border-stone-400 focus:outline-none';

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
      <div className="mx-auto max-w-2xl px-6 py-16">

        <header className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Caltal</h1>
            <p className="mt-1 text-sm text-stone-500">Tasks that find you</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-stone-600">{user.name}</p>
            <button
              onClick={handleSignOut}
              className="mt-1 text-xs text-stone-400 underline underline-offset-2
                         transition-colors hover:text-stone-600"
            >
              Sign out
            </button>
          </div>
        </header>

        <Calendar
          selected={selected}
          onSelect={setSelected}
          refreshKey={refreshKey}
        />

        <section className="mt-10">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
            New task on {format(selected, 'd MMMM')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="What needs doing?"
            />

            <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5">
              {REMINDER_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value)}
                  className={
                    'rounded-md px-4 py-1.5 text-sm transition-all duration-200 ' +
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
                <label className="mb-1.5 block text-xs text-stone-500">
                  Remind me at
                </label>
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
              className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white
                         transition-all duration-200 hover:bg-stone-700 active:scale-[0.98]"
            >
              Add task
            </button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </section>

      </div>
    </div>
  );
}

export default App;
