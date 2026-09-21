import { useState, useEffect } from 'react';

const API = 'https://caltal.fly.dev/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    fetch(API)
      .then(response => response.json())
      .then(data => setTasks(data));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius)
      })
    })
      .then(response => response.json())
      .then(() => {
        loadTasks();
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius('');
      });
  };

  return (
    <div>
      <h1>Caltal</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Task name"
        />
        <input
          value={latitude}
          onChange={e => setLatitude(e.target.value)}
          placeholder="Latitude"
        />
        <input
          value={longitude}
          onChange={e => setLongitude(e.target.value)}
          placeholder="Longitude"
        />
        <input
          value={radius}
          onChange={e => setRadius(e.target.value)}
          placeholder="Radius (m)"
        />
        <button type="submit">Add task</button>
      </form>

      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.name} — {task.radius}m
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;