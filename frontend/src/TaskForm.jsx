import { useState } from 'react';
import Icon from './icons';
import RadiusSlider from './RadiusSlider';
import { today } from './dates';
import { savedPlaceAt } from './usePlaces';
import { buttonClass, inputClass } from './ui';

// There's no Place / Time / Both switch: the type follows from what's filled
// in. A place and a time is BOTH, just one is LOCATION or TIME, and neither is
// a plain to-do (NONE) that simply sits on its day. The same rule as the app.
function reminderTypeOf(draft) {
  if (draft.placeOn && draft.timeOn) return 'BOTH';
  if (draft.placeOn) return 'LOCATION';
  if (draft.timeOn) return 'TIME';
  return 'NONE';
}

// A sensible starting time for a reminder on `date`: the next whole hour if
// it's today (or 23:59 late in the evening, so it isn't already past), and
// 09:00 on any other day.
function startingTime(date) {
  if (date !== today()) {
    return '09:00';
  }
  const hour = new Date().getHours() + 1;
  return hour > 23 ? '23:59' : `${String(hour).padStart(2, '0')}:00`;
}

// A dashed "+ Add a time" style button for an optional part of the task
function AddRow({ icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed border-stone-300 px-4 text-left transition-colors hover:border-stone-400 hover:bg-white"
    >
      <Icon name={icon} size={20} className="flex-none text-caltal" />
      <span className="text-[15px] text-stone-800">{label}</span>
      {hint && <span className="text-sm text-stone-400">{hint}</span>}
    </button>
  );
}

function Segment({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-white p-0.5 ring-1 ring-stone-200">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ' +
            (value === option.value
              ? option.value === 'trigger'
                ? 'bg-teal-600 text-white'
                : 'bg-stone-800 text-white'
              : 'text-stone-500 hover:text-stone-800')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// The form for adding and editing a task. It doesn't keep the task's details
// itself: Home owns them (the `draft`), because the map needs them too. A
// click on the map moves the draft's pin, and the radius slider here resizes
// the circle drawn there. The form shows the draft and reports changes.
//
//   places       saved places, offered as one-click chips
//   onPickPlace  a saved place was chosen (Home moves the pin and the map)
//   onSavePlace  "Save this place" was clicked for the pinned spot
//   touch        a phone or tablet: "tap" rather than "click"
function TaskForm({ draft, onChange, onSubmit, onCancel, places, onPickPlace, onSavePlace, touch }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = draft.taskId != null;
  const click = touch ? 'Tap' : 'Click';
  const movingTrigger = draft.triggerOn && draft.picking === 'trigger';

  // The saved place the pin is on, if it's on one
  const pinnedPlace =
    draft.placeOn && draft.latitude != null
      ? savedPlaceAt(places, draft.latitude, draft.longitude)
      : null;

  // A time box always shows a time, so give it one to start from
  const addTime = () =>
    onChange({ timeOn: true, remindAt: draft.remindAt || startingTime(draft.date) });

  const placeHelp = () => {
    if (movingTrigger) {
      return draft.trigger.latitude != null
        ? `Reminder place set. ${click} the map to move it.`
        : `${click} the map, or search above, to choose where you'll be reminded.`;
    }
    if (pinnedPlace) {
      return `At ${pinnedPlace.name}. ${click} the map to move it.`;
    }
    if (draft.latitude != null) {
      return `Pinned. ${click} the map to move it.`;
    }
    return places.length > 0
      ? `${click} the map, search above, or pick one of your places.`
      : `${click} the map, or search above, to choose where this task lives.`;
  };

  const submit = async event => {
    event.preventDefault();
    setError('');

    if (!draft.name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (draft.timeOn && !draft.remindAt) {
      setError('Choose a time, or remove it.');
      return;
    }
    if (draft.placeOn && draft.latitude == null) {
      setError(`${click} the map, search, or pick a saved place. Or remove the place.`);
      return;
    }
    if (draft.placeOn && draft.triggerOn && draft.trigger.latitude == null) {
      setError(`${click} the map to set where you'll be reminded, or untick "Remind me somewhere else".`);
      return;
    }

    // The server rejects fields a reminder type doesn't use, so send only the
    // ones this type needs
    const payload = {
      name: draft.name.trim(),
      dueDate: draft.date,
      reminderType: reminderTypeOf(draft),
    };

    if (draft.placeOn) {
      payload.latitude = draft.latitude;
      payload.longitude = draft.longitude;
      payload.radius = draft.radius;

      if (draft.triggerOn) {
        payload.triggerLatitude = draft.trigger.latitude;
        payload.triggerLongitude = draft.trigger.longitude;
        payload.triggerRadius = draft.trigger.radius;
      }
    }

    if (draft.timeOn) {
      payload.remindAt = draft.remindAt;
    }

    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-stone-800">
          {editing ? 'Edit task' : 'New task'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-700"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <input
        className={inputClass}
        value={draft.name}
        onChange={event => onChange({ name: event.target.value })}
        placeholder="What needs doing?"
        maxLength={255}
        autoFocus={!editing}
        aria-label="Task name"
      />

      <div>
        <label htmlFor="task-date" className="mb-1.5 block text-xs text-stone-500">
          Date
        </label>
        <input
          id="task-date"
          type="date"
          className={inputClass}
          value={draft.date}
          onChange={event => event.target.value && onChange({ date: event.target.value })}
        />
      </div>

      <p className="text-xs text-stone-500">Remind me</p>

      {draft.timeOn ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            className={inputClass}
            value={draft.remindAt}
            onChange={event => onChange({ remindAt: event.target.value })}
            aria-label="Reminder time"
          />
          <button
            type="button"
            onClick={() => onChange({ timeOn: false })}
            aria-label="Remove the time"
            className="flex-none rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-700"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : (
        <AddRow icon="time" label="Add a time" onClick={addTime} />
      )}

      {draft.placeOn ? (
        <div className="space-y-3">
          <div
            className={
              'flex items-center gap-3 rounded-xl p-3 ' +
              (movingTrigger ? 'bg-teal-50' : 'bg-caltal-soft')
            }
          >
            <Icon
              name="location"
              size={20}
              filled={movingTrigger ? draft.trigger.latitude != null : draft.latitude != null}
              className={'flex-none ' + (movingTrigger ? 'text-teal-600' : 'text-stone-800')}
            />
            <p className="text-sm leading-snug text-stone-600">{placeHelp()}</p>
          </div>

          {places.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {places.map(place => {
                const chosen = !movingTrigger && pinnedPlace?.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => onPickPlace(place)}
                    className={
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ' +
                      (chosen
                        ? 'bg-stone-800 text-white'
                        : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300')
                    }
                  >
                    <Icon
                      name="bookmark"
                      size={13}
                      filled
                      className={chosen ? 'text-white' : 'text-caltal'}
                    />
                    {place.name}
                  </button>
                );
              })}
            </div>
          )}

          {!movingTrigger && draft.latitude != null && !pinnedPlace && (
            <button
              type="button"
              onClick={onSavePlace}
              className="flex items-center gap-1.5 text-sm font-medium text-caltal hover:underline"
            >
              <Icon name="bookmark" size={16} />
              Save this place for next time
            </button>
          )}

          <RadiusSlider
            label="Remind me within"
            value={draft.radius}
            onChange={radius => onChange({ radius })}
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-stone-500">
            <input
              type="checkbox"
              checked={draft.triggerOn}
              onChange={event =>
                onChange({
                  triggerOn: event.target.checked,
                  picking: event.target.checked ? 'trigger' : 'task',
                })
              }
              className="mt-0.5 h-3.5 w-3.5 rounded accent-stone-800"
            />
            <span>
              Remind me somewhere else: useful when the task is somewhere you only pass
              now and then, and you&rsquo;d rather hear about it on your way.
            </span>
          </label>

          {draft.triggerOn && (
            <div className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-500">{`${touch ? 'Tapping' : 'Clicking'} the map moves`}</span>
                <Segment
                  value={draft.picking}
                  onChange={picking => onChange({ picking })}
                  options={[
                    { value: 'task', label: 'The task' },
                    { value: 'trigger', label: 'Reminder place' },
                  ]}
                />
              </div>
              <RadiusSlider
                label="Remind me within (reminder place)"
                value={draft.trigger.radius}
                onChange={radius => onChange({ trigger: { ...draft.trigger, radius } })}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange({ placeOn: false, triggerOn: false, picking: 'task' })}
            className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800"
          >
            {draft.triggerOn ? 'Remove the place (and the reminder place with it)' : 'Remove the place'}
          </button>
        </div>
      ) : (
        <AddRow
          icon="location"
          label="Add a place"
          hint={`or ${click.toLowerCase()} the map`}
          onClick={() => onChange({ placeOn: true, picking: 'task' })}
        />
      )}

      {!draft.timeOn && !draft.placeOn && (
        <p className="text-xs leading-relaxed text-stone-400">
          No reminder: it will just sit on its day in the calendar.
        </p>
      )}

      {error !== '' && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
      </button>
    </form>
  );
}

export default TaskForm;
