import { useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react';
import DayTasks from './DayTasks';
import Icon from './icons';
import Loading from './Loading';
import MonthCalendar from './MonthCalendar';
import NearMe from './NearMe';
import Panel from './Panel';
import Profile from './Profile';
import SavePlaceDialog from './SavePlaceDialog';
import SearchBar from './SearchBar';
import TaskDetail from './TaskDetail';
import TaskForm from './TaskForm';
import TaskMap from './TaskMap';
import { SHEET_HALF as HALF, SHEET_STOPS } from './config';
import { longDay, shortTime, today } from './dates';
import { useMediaQuery } from './router';
import { getDefaultRadius } from './settings';
import { savedPlaceAt } from './usePlaces';
import { hasPlace } from './useTasks';
import { sectionTitleClass } from './ui';

const GEOLOCATION_ERRORS = {
  1: 'Location is blocked for this site. You can allow it in your browser settings.',
  2: 'Your location is not available right now.',
  3: 'Finding your location took too long.',
};

// A blank task for the form, optionally already pinned somewhere. Whether it
// has a time and whether it has a place are two separate switches; the
// reminder type is worked out from them when it's saved.
function newDraft(date, place) {
  return {
    taskId: null,
    name: '',
    date,
    timeOn: false,
    remindAt: '',
    placeOn: place != null,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    radius: getDefaultRadius(),
    // The optional second place: where to be reminded, when that isn't the
    // task's own place. `picking` says which of the two a map click moves.
    triggerOn: false,
    trigger: { latitude: null, longitude: null, radius: 300 },
    picking: 'task',
  };
}

function draftFromTask(task) {
  const hasTrigger = task.triggerLatitude != null;
  return {
    taskId: task.id,
    name: task.name,
    date: task.dueDate,
    timeOn: task.remindAt != null,
    remindAt: shortTime(task.remindAt),
    placeOn: hasPlace(task),
    latitude: task.latitude,
    longitude: task.longitude,
    radius: task.radius ?? getDefaultRadius(),
    triggerOn: hasTrigger,
    trigger: hasTrigger
      ? { latitude: task.triggerLatitude, longitude: task.triggerLongitude, radius: task.triggerRadius }
      : { latitude: null, longitude: null, radius: 300 },
    picking: 'task',
  };
}

// The signed-in home page: the map fills the window, and everything else
// sits on top of it. The search bar and profile button along the top, and a
// panel holding the calendar, a task's details or the task form. The same
// layout as the phone app's home screen.
function Home({ ref, user, tasks: taskList, places: placeList, onSignOut }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const touch = useMediaQuery('(pointer: coarse)');

  const { tasks, loading, error, refresh, create, update, complete, remove, removeVoiceNote } =
    taskList;
  const { places, save: savePlace } = placeList;

  const map = useRef(null);

  // What the panel shows: 'calendar', 'task' (one task's details) or 'form'
  const [mode, setMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [searched, setSearched] = useState(null);
  // The spot being saved as a place, while the "Save this place" box is open
  const [savingSpot, setSavingSpot] = useState(null);
  // How far up the sheet is on a phone (an index into SHEET_STOPS)
  const [stop, setStop] = useState(HALF);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  // On a phone with the sheet pulled right up, the buttons over the map would
  // sit on top of the sheet's contents, so they step aside
  const sheetFull = !wide && stop === SHEET_STOPS.length - 1;

  const selectedTask = tasks.find(task => task.id === selectedId) ?? null;
  // A task deleted on another device while open here falls back to the calendar
  const view = mode === 'task' && !selectedTask ? 'calendar' : mode;

  // Calendar dots: orange if anything that day is still to do, grey if all done
  const marks = useMemo(() => {
    const result = {};
    for (const task of tasks) {
      if (!task.complete) {
        result[task.dueDate] = 'open';
      } else if (!result[task.dueDate]) {
        result[task.dueDate] = 'done';
      }
    }
    return result;
  }, [tasks]);

  const dayTasks = tasks.filter(task => task.dueDate === selectedDate);

  // How much of the map the panel covers, so a point flown to lands in the
  // part that can actually be seen
  const padding = wide
    ? { top: 80, left: 432, right: 16, bottom: 16 }
    : {
        top: 130,
        left: 0,
        right: 0,
        bottom: Math.round(window.innerHeight * SHEET_STOPS[Math.min(stop, HALF)]),
      };

  // Move the map so a point sits in the visible part. On a phone with the
  // sheet pulled right up, lower it first so the map can be seen.
  const showOnMap = useCallback(
    (latitude, longitude, zoom = 15) => {
      if (!wide && stop > HALF) {
        setStop(HALF);
      }
      map.current?.flyTo(latitude, longitude, zoom);
    },
    [wide, stop],
  );

  // If this browser has already been allowed to know where it is, start the
  // map there. Never asks: the prompt only comes from the locate button.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then(status => {
        if (status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          position => {
            const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setMe(here);
            map.current?.flyTo(here.latitude, here.longitude, 14);
          },
          () => {},
          { maximumAge: 300000, timeout: 10000 },
        );
      })
      .catch(() => {});
  }, []);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('This browser cannot report your location.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setMe(here);
        setLocating(false);
        showOnMap(here.latitude, here.longitude);
      },
      failure => {
        setLocating(false);
        setLocateError(GEOLOCATION_ERRORS[failure.code] ?? 'Could not get your location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  // ---- Moving between calendar, task and form ----

  const openTask = task => {
    setSelectedId(task.id);
    setSelectedDate(task.dueDate);
    setMode('task');
    setDraft(null);
    if (hasPlace(task)) {
      showOnMap(task.latitude, task.longitude);
    } else if (!wide && stop < HALF) {
      setStop(HALF);
    }
  };

  const backToCalendar = () => {
    setMode('calendar');
    setSelectedId(null);
    setDraft(null);
  };

  const startNewTask = place => {
    setDraft(newDraft(selectedDate, place));
    setSelectedId(null);
    setSearched(null);
    setMode('form');
    if (!wide) {
      setStop(HALF);
    }
  };

  const startEditing = task => {
    setDraft(draftFromTask(task));
    setMode('form');
    if (!wide) {
      setStop(HALF);
    }
  };

  const cancelForm = () => {
    setMode(draft?.taskId != null ? 'task' : 'calendar');
    setDraft(null);
  };

  const saveForm = async payload => {
    if (draft.taskId != null) {
      const saved = await update(draft.taskId, payload);
      setSelectedId(saved.id);
      setSelectedDate(saved.dueDate);
      setMode('task');
    } else {
      const saved = await create(payload);
      setSelectedDate(saved.dueDate);
      setMode('calendar');
    }
    setDraft(null);
  };

  const changeDraft = changes => setDraft(current => ({ ...current, ...changes }));

  // Puts the pin being placed at this spot: the task's own place, or its
  // second reminder place if that's the one being set
  const pinDraftAt = place =>
    setDraft(current => {
      if (current.triggerOn && current.picking === 'trigger') {
        return {
          ...current,
          trigger: { ...current.trigger, latitude: place.latitude, longitude: place.longitude },
        };
      }
      return { ...current, placeOn: true, latitude: place.latitude, longitude: place.longitude };
    });

  // ---- The map ----

  // While the form is open, a click on the map puts the pin there (adding a
  // place if the task had none). Otherwise a click on empty map lets go of
  // the last search result.
  const pressMap = place => {
    if (view === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(null);
    }
  };

  // Right-click (or press and hold on a phone) anywhere starts a task there
  const holdMap = place => {
    if (view !== 'form') {
      startNewTask(place);
    }
  };

  // Returns whether the click was used, so the map knows whether to treat it
  // as an ordinary click as well
  const pressPin = id => {
    const task = tasks.find(candidate => candidate.id === id);
    if (!task) {
      return false;
    }
    if (view !== 'form') {
      openTask(task);
      return true;
    }
    // In the form, a pin is a place like any other: put the new pin on it.
    // If a saved place is there too (often hidden under the task's pin), use
    // its exact spot so the form knows it's that place.
    if (hasPlace(task)) {
      pinDraftAt(savedPlaceAt(places, task.latitude, task.longitude) ?? task);
      return true;
    }
    return false;
  };

  // A saved place's dot: in the form it moves the pin there, otherwise it's
  // picked just like a search result
  const pressPlace = id => {
    const place = places.find(candidate => candidate.id === id);
    if (!place) {
      return false;
    }
    if (view === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(place);
    }
    showOnMap(place.latitude, place.longitude, 16);
    return true;
  };

  // ---- Search ----

  const getNear = useCallback(() => map.current?.centre() ?? null, []);

  const choosePlace = place => {
    if (view === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(place);
    }
    showOnMap(place.latitude, place.longitude, 16);
  };

  // A chip in the task form: pin the task at that saved place
  const pickPlaceForTask = place => {
    pinDraftAt(place);
    showOnMap(place.latitude, place.longitude, 16);
  };

  // A search result that isn't saved yet can be
  const searchedIsSaved =
    searched !== null && savedPlaceAt(places, searched.latitude, searched.longitude) !== null;

  const closeSaveDialog = useCallback(() => setSavingSpot(null), []);

  const saveSpot = async place => {
    const saved = await savePlace(place);
    // If it was the searched spot, it's a saved place now
    if (searched && savedPlaceAt([saved], searched.latitude, searched.longitude)) {
      setSearched(saved);
    }
    return saved;
  };

  // What App can ask for: "Show on map" from the Saved places page
  useImperativeHandle(ref, () => ({
    showPlace(place) {
      setSearched(place);
      map.current?.flyTo(place.latitude, place.longitude, 16);
    },
  }));

  // ---- Layout ----

  const searchBar = (
    <SearchBar
      getNear={getNear}
      saved={places}
      onSelect={choosePlace}
      onClear={() => setSearched(null)}
      onFocus={() => {
        // On a phone, lower the sheet so the results aren't hidden behind it
        if (!wide && stop > 0) {
          setStop(0);
        }
      }}
    />
  );

  const logo = (
    <img
      src="/logo.png"
      alt="Caltal"
      draggable="false"
      className={(wide ? 'h-12 w-12' : 'h-11 w-11') + ' flex-none drop-shadow'}
    />
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-stone-100">
      <TaskMap
        ref={map}
        tasks={tasks}
        selectedId={view === 'task' ? selectedId : null}
        draft={view === 'form' ? draft : null}
        searched={searched}
        places={places}
        me={me}
        padding={padding}
        onPress={pressMap}
        onLongPress={holdMap}
        onPinPress={pressPin}
        onPlacePress={pressPlace}
      />

      {wide ? (
        <>
          <div className="absolute left-4 top-4 z-30 flex w-[400px] items-start gap-3">
            {logo}
            {searchBar}
          </div>
          {/* z-40: the menu it opens must cover the buttons below it */}
          <div className="absolute right-4 top-4 z-40">
            <Profile user={user} onSignOut={onSignOut} />
          </div>
        </>
      ) : (
        <div className="absolute inset-x-3 top-3 z-40 flex items-start gap-2">
          {logo}
          {searchBar}
          <Profile user={user} onSignOut={onSignOut} />
        </div>
      )}

      {/* What can be done with a search result */}
      {searched && view !== 'form' && !sheetFull && (
        <div
          className={
            'absolute z-30 flex gap-2 ' + (wide ? 'left-[432px] top-4' : 'left-3 top-[68px]')
          }
        >
          <button
            type="button"
            onClick={() => startNewTask(searched)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-stone-800 px-4 text-sm font-medium text-white shadow-lg transition-colors hover:bg-stone-700"
          >
            <Icon name="plus" size={18} />
            Add a task here
          </button>
          {!searchedIsSaved && (
            <button
              type="button"
              onClick={() => setSavingSpot(searched)}
              className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-stone-800 shadow-lg ring-1 ring-stone-900/5 transition-colors hover:bg-stone-50"
            >
              <Icon name="bookmark" size={16} />
              Save place
            </button>
          )}
        </div>
      )}

      <div
        className={
          'absolute z-30 flex flex-col items-end gap-2 ' +
          (wide ? 'right-4 top-20' : 'right-3 top-[68px]') +
          (sheetFull ? ' hidden' : '')
        }
      >
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="Show where I am"
          title="Show where I am"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-800 shadow-lg ring-1 ring-stone-900/5 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          <Icon name="locate" size={18} className={locating ? 'animate-pulse' : ''} />
        </button>
        {locateError !== '' && (
          <p className="max-w-56 rounded-xl bg-white px-3 py-2 text-xs text-red-600 shadow-lg">
            {locateError}
          </p>
        )}
      </div>

      <Panel wide={wide} stop={stop} onStop={setStop}>
        {/* Kept mounted while hidden, so the month on show and "Near me"
            carry on while a task or the form is open */}
        <div className={view === 'calendar' ? 'space-y-5' : 'hidden'}>
          <MonthCalendar selected={selectedDate} onSelect={setSelectedDate} marks={marks} />

          <div className="flex items-center justify-between">
            <h3 className={sectionTitleClass}>{longDay(selectedDate)}</h3>
            <button
              type="button"
              onClick={() => startNewTask(null)}
              aria-label="Add a task on this day"
              title="Add a task on this day"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-caltal text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <Icon name="plus" size={20} strokeWidth={2.25} />
            </button>
          </div>

          {error !== '' ? (
            <button type="button" onClick={refresh} className="text-left text-sm text-red-600">
              {`Couldn't load your tasks: ${error} Click to try again.`}
            </button>
          ) : loading ? (
            <Loading size={48} />
          ) : (
            <DayTasks
              tasks={dayTasks}
              onOpen={openTask}
              onComplete={task => complete(task.id)}
              touch={touch}
            />
          )}

          <div className="border-t border-stone-200 pt-5">
            <NearMe refreshKey={tasks} onOpen={openTask} onPosition={setMe} />
          </div>
        </div>

        {view === 'task' && selectedTask && (
          <TaskDetail
            task={selectedTask}
            onBack={backToCalendar}
            onEdit={() => startEditing(selectedTask)}
            onComplete={() => complete(selectedTask.id)}
            onDelete={async () => {
              await remove(selectedTask.id);
              backToCalendar();
            }}
            onShowOnMap={() => showOnMap(selectedTask.latitude, selectedTask.longitude)}
            onRemoveVoiceNote={() => removeVoiceNote(selectedTask.id)}
          />
        )}

        {view === 'form' && draft && (
          <TaskForm
            draft={draft}
            onChange={changeDraft}
            onSubmit={saveForm}
            onCancel={cancelForm}
            places={places}
            onPickPlace={pickPlaceForTask}
            onSavePlace={() =>
              setSavingSpot({ latitude: draft.latitude, longitude: draft.longitude })
            }
            touch={touch}
          />
        )}
      </Panel>

      {savingSpot && (
        <SavePlaceDialog
          spot={savingSpot}
          places={places}
          onSave={saveSpot}
          onClose={closeSaveDialog}
        />
      )}
    </div>
  );
}

export default Home;
