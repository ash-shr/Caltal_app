import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/style.css';
import { getTasksOnDate } from './api';

function Calendar({ selected, onSelect, refreshKey }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selected) return;

    getTasksOnDate(format(selected, 'yyyy-MM-dd'))
      .then(setTasks)
      .catch(err => setError(err.message));
  }, [selected, refreshKey]);

  return (
    <div>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
      />

      {selected && <h2>{format(selected, 'EEEE d MMMM yyyy')}</h2>}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {tasks.length === 0 ? (
        <p>No tasks on this day.</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>{task.name} — {task.radius}m</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Calendar;