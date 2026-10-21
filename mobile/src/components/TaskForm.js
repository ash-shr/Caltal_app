import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import AddRow from './AddRow';
import Button from './Button';
import DateTimeField from './DateTimeField';
import VoiceNoteField from './VoiceNoteField';
import { today } from '../dates';
import { savedPlaceAt } from '../places';
import { RADIUS_MAX, RADIUS_MIN } from '../settings';
import { colours } from '../theme';

// There's no Place / Time / Both switch: the type follows from what's filled
// in. A place and a time is BOTH, just one is LOCATION or TIME, and neither is
// a plain to-do (NONE) that simply sits on its day.
export function reminderTypeOf(draft) {
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

// The form for adding and editing a task. It doesn't keep the task's details
// itself: HomeScreen owns them (the `draft`), because the map needs them too —
// a tap on the map moves the draft's pin, and the radius slider here resizes
// the circle drawn there. The form shows the draft and reports changes.
//   places       saved places, offered as one-tap chips
//   onPickPlace  a saved place was tapped (HomeScreen moves the pin and map)
//   onSavePlace  "Save this place" was tapped for the pinned spot
export default function TaskForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  placeRemindersOn,
  places = [],
  onPickPlace,
  onSavePlace,
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);

  const editing = draft.taskId != null;

  // The saved place the pin is on, if it's on one
  const pinnedPlace =
    draft.placeOn && draft.latitude != null
      ? savedPlaceAt(places, draft.latitude, draft.longitude)
      : null;

  // A time picker always shows a time, so give it one to start from.
  const addTime = () =>
    onChange({ timeOn: true, remindAt: draft.remindAt || startingTime(draft.date) });

  const submit = async () => {
    setError('');

    if (recording) {
      setError('Stop the recording first.');
      return;
    }
    if (!draft.name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (draft.placeOn && draft.latitude == null) {
      setError('Tap the map, search, or pick a saved place. Or remove the place.');
      return;
    }

    // The server rejects fields a reminder type doesn't use, so send only the
    // ones this type needs.
    const payload = {
      name: draft.name.trim(),
      dueDate: draft.date,
      reminderType: reminderTypeOf(draft),
    };

    if (draft.placeOn) {
      payload.latitude = draft.latitude;
      payload.longitude = draft.longitude;
      payload.radius = draft.radius;

      // A second "remind me here instead" place can only be set on the website
      // for now. Send it back unchanged so editing here doesn't erase it.
      if (draft.trigger) {
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
    <View style={styles.form}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{editing ? 'Edit task' : 'New task'}</Text>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Cancel">
          <Ionicons name="close" size={24} color={colours.muted} />
        </Pressable>
      </View>

      {/* BottomSheetTextInput rather than TextInput: it tells the sheet to
          make room when the keyboard opens */}
      <BottomSheetTextInput
        style={styles.input}
        value={draft.name}
        onChangeText={name => onChange({ name })}
        placeholder="What needs doing?"
        placeholderTextColor={colours.faint}
        maxLength={255}
        autoFocus={!editing}
      />

      <DateTimeField
        label="Date"
        mode="date"
        value={draft.date}
        onChange={date => onChange({ date })}
      />

      <Text style={styles.label}>Remind me</Text>

      {draft.timeOn ? (
        <View style={styles.removableRow}>
          <View style={styles.grow}>
            <DateTimeField
              label="At"
              mode="time"
              value={draft.remindAt}
              onChange={remindAt => onChange({ remindAt })}
            />
          </View>
          <Pressable
            onPress={() => onChange({ timeOn: false })}
            hitSlop={8}
            accessibilityLabel="Remove the time"
          >
            <Ionicons name="close-circle" size={24} color={colours.faint} />
          </Pressable>
        </View>
      ) : (
        <AddRow icon="time-outline" label="Add a time" onPress={addTime} />
      )}

      {draft.placeOn ? (
        <View style={styles.place}>
          <View style={styles.placeStatus}>
            <Ionicons
              name={draft.latitude != null ? 'location' : 'location-outline'}
              size={20}
              color={draft.latitude != null ? colours.ink : colours.orange}
            />
            <Text style={styles.placeText}>
              {pinnedPlace
                ? `At ${pinnedPlace.name}. Tap the map to move it.`
                : draft.latitude != null
                  ? 'Pinned. Tap the map to move it.'
                  : places.length > 0
                    ? 'Tap the map, search above, or pick one of your places.'
                    : 'Tap the map, or search above, to choose where this task lives.'}
            </Text>
          </View>

          {places.length > 0 && (
            <View style={styles.chips}>
              {places.map(place => {
                const chosen = pinnedPlace?.id === place.id;
                return (
                  <Pressable
                    key={place.id}
                    onPress={() => onPickPlace?.(place)}
                    style={[styles.chip, chosen && styles.chipChosen]}
                  >
                    <Ionicons
                      name="bookmark"
                      size={13}
                      color={chosen ? '#ffffff' : colours.orange}
                    />
                    <Text style={[styles.chipText, chosen && styles.chipTextChosen]}>
                      {place.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {draft.latitude != null && !pinnedPlace && (
            <Pressable onPress={onSavePlace} style={styles.saveLink} hitSlop={6}>
              <Ionicons name="bookmark-outline" size={16} color={colours.orange} />
              <Text style={styles.saveLinkText}>Save this place for next time</Text>
            </Pressable>
          )}

          <View style={styles.radiusHeader}>
            <Text style={styles.label}>Remind me within</Text>
            <Text style={styles.radiusValue}>{draft.radius} m</Text>
          </View>

          <Slider
            minimumValue={RADIUS_MIN}
            maximumValue={RADIUS_MAX}
            step={10}
            value={draft.radius}
            onValueChange={radius => onChange({ radius })}
            minimumTrackTintColor={colours.orange}
            maximumTrackTintColor={colours.border}
            thumbTintColor={colours.ink}
          />

          {draft.trigger && (
            <Text style={styles.note}>
              {"This task also has a second reminder place, set on the website. It's kept as it is."}
            </Text>
          )}

          {!placeRemindersOn && (
            <Text style={styles.note}>
              {"Place reminders are off. Turn them on in Settings to be told when you're nearby."}
            </Text>
          )}

          <Pressable
            onPress={() => onChange({ placeOn: false })}
            style={styles.removeLink}
            hitSlop={6}
          >
            <Text style={styles.removeLinkText}>
              {draft.trigger
                ? 'Remove the place (and the second reminder place with it)'
                : 'Remove the place'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <AddRow
          icon="location-outline"
          label="Add a place"
          hint="or tap the map"
          onPress={() => onChange({ placeOn: true })}
        />
      )}

      {!draft.timeOn && !draft.placeOn && (
        <Text style={styles.note}>
          No reminder: it will just sit on its day in the calendar.
        </Text>
      )}

      <VoiceNoteField
        value={draft.voiceNote}
        taskId={draft.taskId}
        onChange={voiceNote => onChange({ voiceNote })}
        onRecordingChange={setRecording}
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <Button title={editing ? 'Save changes' : 'Add task'} onPress={submit} busy={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '600', color: colours.ink, letterSpacing: -0.3 },
  input: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colours.ink,
  },
  label: { fontSize: 13, color: colours.muted },
  removableRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  removeLink: { alignSelf: 'flex-start' },
  removeLinkText: { fontSize: 14, color: colours.muted, textDecorationLine: 'underline' },
  place: { gap: 10 },
  placeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colours.orangeSoft,
    borderRadius: 12,
    padding: 12,
  },
  placeText: { flex: 1, fontSize: 14, color: colours.body, lineHeight: 19 },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  radiusValue: { fontSize: 13, color: colours.ink, fontWeight: '600' },
  note: { fontSize: 12, color: colours.muted, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipChosen: { backgroundColor: colours.ink, borderColor: colours.ink },
  chipText: { fontSize: 14, color: colours.body },
  chipTextChosen: { color: '#ffffff' },
  saveLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  saveLinkText: { fontSize: 14, color: colours.orange, fontWeight: '500' },
  error: { fontSize: 14, color: colours.danger },
});
