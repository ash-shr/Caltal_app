import { useState, useEffect } from 'react';
import { getAllTasks, createTask } from './api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    getAllTasks().then(setTasks);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    createTask({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      dueDate,
    })
      .then(() => {
        loadTasks();
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius('');
        setDueDate('');
      })
      .catch(err => setError(err.message));
  };

  return (
    <div>
      <h1>Caltal</h1>

      <form onSubmit={handleSubmit}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name" />
        <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" />
        <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" />
        <input value={radius} onChange={e => setRadius(e.target.value)} placeholder="Radius (m)" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <button type="submit">Add task</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.name} — {task.dueDate} — {task.radius}m
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;