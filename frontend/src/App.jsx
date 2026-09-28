import { useState } from 'react';
import { format } from 'date-fns';
import Calendar from './Calendar';
import TaskList from './TaskList';
import NearMe from './NearMe';
import TaskForm from './TaskForm';
import TaskDetail from './TaskDetail';
import Auth from './Auth';
import Profile from './Profile';
import { createTask, getStoredUser, clearSession } from './api';

function App() {
  const [user, setUser] = useState(getStoredUser());

  const [selected, setSelected] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [openTask, setOpenTask] = useState(null);

  // Bumping this remounts the new-task form, which is how it gets cleared.
  const [formKey, setFormKey] = useState(0);

  const refresh = () => setRefreshKey(key => key + 1);

  const handleSignOut = () => {
    clearSession();
    setUser(null);
  };

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">

        <header className="mb-10 flex items-start justify-between sm:mb-14">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Caltal</h1>
            <p className="mt-1 text-sm text-stone-500">Tasks that find you</p>
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
