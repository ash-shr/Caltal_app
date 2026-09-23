import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Calendar from './Calendar';
import { createTask } from './api';

function App() {
  const [selected, setSelected] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    createTask({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      dueDate: format(selected, 'yyyy-MM-dd'),
    })
      .then(() => {
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius('');
        setRefreshKey(key => key + 1);
      })
      .catch(err => setError(err.message));
  };

  return (
    <div>
      <h1>Caltal</h1>

      <Calendar
        selected={selected}
        onSelect={setSelected}
        refreshKey={refreshKey}
      />

      <h3>Add a task on {format(selected, 'd MMMM')}</h3>

      <form onSubmit={handleSubmit}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name" />
        <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" />
        <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" />
        <input value={radius} onChange={e => setRadius(e.target.value)} placeholder="Radius (m)" />
        <button type="submit">Add task</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;