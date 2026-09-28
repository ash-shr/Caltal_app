import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Calendar from './Calendar';
import TaskList from './TaskList';
import NearMe from './NearMe';
import TaskForm from './TaskForm';
import TaskDetail from './TaskDetail';
import Auth from './Auth';
import Splash from './Splash';
import Profile from './Profile';
import { createTask, getStoredUser, clearSession } from './api';

// How long the splash stays up at minimum. Long enough to read as deliberate
// rather than a flicker, short enough not to be in the way.
const SPLASH_MS = 1400;

function App() {
  const [user, setUser] = useState(getStoredUser());
  const [booting, setBooting] = useState(true);

  const [selected, setSelected] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [openTask, setOpenTask] = useState(null);

  // Bumping this remounts the new-task form, which is how it gets cleared.
  const [formKey, setFormKey] = useState(0);

  const refresh = () => setRefreshKey(key => key + 1);

  // Every reload starts on the splash, the way an app does.
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    clearSession();
    setUser(null);
  };

  if (booting) {
    return <Splash />;
  }

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">

        <header className="mb-10 flex items-start justify-between sm:mb-14">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="h-20 w-20"
            />
            <div>
              <h1 className="text-2xl font-medium tracking-tight">Caltal</h1>
              <p className="mt-0.5 text-sm text-stone-500">Tasks that find you</p>
            </div>
          </div>

          <Profile user={user} onSignOut={handleSignOut} />
        </header>

        {/* Calendar leads; everything else sits beside it on a wide screen and
            stacks beneath it on a narrow one. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">

          <Calendar
            selected={selected}
            onSelect={setSelected}
            refreshKey={refreshKey}
          />

          <aside className="space-y-10">
            <NearMe refreshKey={refreshKey} onOpen={setOpenTask} />

            <TaskList
              selected={selected}
              refreshKey={refreshKey}
              onChanged={refresh}
              onOpen={setOpenTask}
            />

            <section>
              <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
                New task on {format(selected, 'd MMMM')}
              </h2>

              <TaskForm
                key={formKey}
                dueDate={selected}
                submitLabel="Add task"
                onSubmit={payload =>
                  createTask(payload).then(() => {
                    setFormKey(key => key + 1);
                    refresh();
                  })
                }
              />
            </section>
          </aside>

        </div>
      </div>

      <TaskDetail
        task={openTask}
        onClose={() => setOpenTask(null)}
        onChanged={refresh}
      />
    </div>
  );
}

export default App;
