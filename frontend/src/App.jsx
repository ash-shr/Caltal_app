import { useState } from 'react';
import { format } from 'date-fns';
import Calendar from './Calendar';
import MapPicker from './MapPicker';
import { createTask } from './api';

function App() {
  const [selected, setSelected] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [radius, setRadius] = useState(200);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    createTask({
      name,
      latitude,
      longitude,
      radius,
      dueDate: format(selected, 'yyyy-MM-dd'),
    })
      .then(() => {
        setName('');
        setLatitude(null);
        setLongitude(null);
        setRadius(200);
        setRefreshKey(key => key + 1);
      })
      .catch(err => setError(err.message));
  };

  const inputClass =
    'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm ' +
    'text-stone-800 placeholder:text-stone-400 transition-colors duration-200 ' +
    'focus:border-stone-400 focus:outline-none';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
      <div className="mx-auto max-w-2xl px-6 py-16">

        <header className="mb-12">
          <h1 className="text-2xl font-medium tracking-tight">Caltal</h1>
          <p className="mt-1 text-sm text-stone-500">Tasks that find you</p>
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