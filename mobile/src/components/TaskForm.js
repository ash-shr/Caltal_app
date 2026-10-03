import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import DateTimeField from './DateTimeField';
import Segmented from './Segmented';
import { today } from '../dates';
import { RADIUS_MAX, RADIUS_MIN } from '../settings';
import { colours } from '../theme';

const REMINDER_TYPES = [
  { value: 'LOCATION', label: 'Place' },
  { value: 'TIME', label: 'Time' },
  { value: 'BOTH', label: 'Both' },
];

export function needsPlace(type) {
  return type === 'LOCATION' || type === 'BOTH';
}

export function needsTime(type) {
  return type === 'TIME' || type === 'BOTH';
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
export default function TaskForm({ draft, onChange, onSubmit, onCancel, placeRemindersOn }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = draft.taskId != null;
  const wantsPlace = needsPlace(draft.reminderType);
  const wantsTime = needsTime(draft.reminderType);

  const chooseType = type => {
    // A time picker always shows a time, so give it one to start from.
    if (needsTime(type) && !draft.remindAt) {
      onChange({ reminderType: type, remindAt: startingTime(draft.date) });
    } else {
      onChange({ reminderType: type });
    }
  };

  const submit = async () => {
    setError('');

    if (!draft.name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (wantsPlace && draft.latitude == null) {
      setError('Tap the map, or search, to choose a place.');
      return;
    }

    // The server rejects fields a reminder type doesn't use, so send only the
    // ones this type needs.
    const payload = {
      name: draft.name.trim(),
      dueDate: draft.date,
      reminderType: draft.reminderType,
    };

    if (wantsPlace) {
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

    if (wantsTime) {
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

      <Text style={styles.label}>Remind me by</Text>
      <Segmented options={REMINDER_TYPES} value={draft.reminderType} onChange={chooseType} />

      {wantsTime && (
        <DateTimeField
          label="Remind me at"
          mode="time"
          value={draft.remindAt}
          onChange={remindAt => onChange({ remindAt })}
        />
      )}

      {wantsPlace && (
        <View style={styles.place}>
          <View style={styles.placeStatus}>
            <Ionicons
              name={draft.latitude != null ? 'location' : 'location-outline'}
              size={20}
              color={draft.latitude != null ? colours.ink : colours.orange}
            />
            <Text style={styles.placeText}>
              {draft.latitude != null
                ? 'Pinned. Tap the map to move it.'
                : 'Tap the map, or search above, to choose where this task lives.'}
            </Text>
          </View>

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
        </View>
      )}

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
  error: { fontSize: 14, color: colours.danger },
});
