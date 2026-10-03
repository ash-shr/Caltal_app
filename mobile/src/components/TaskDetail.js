import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { longDay, shortTime } from '../dates';
import { hasPlace } from '../tasks';
import { colours } from '../theme';

const TYPE_LABELS = { LOCATION: 'Place', TIME: 'Time', BOTH: 'Place and time' };

function Line({ icon, children }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={18} color={colours.muted} />
      <Text style={styles.lineText}>{children}</Text>
    </View>
  );
}

export default function TaskDetail({ task, onBack, onEdit, onComplete, onDelete, onShowOnMap }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (which, action) => {
    setBusy(which);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy('');
    }
  };

  // Deleting can't be undone, so ask first. Alert.alert shows the phone's own
  // confirmation dialog.
  const confirmDelete = () => {
    Alert.alert('Delete this task?', `"${task.name}" will be gone for good.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run('delete', onDelete) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={colours.muted} />
        <Text style={styles.backText}>Calendar</Text>
      </Pressable>

      <Text style={[styles.name, task.complete && styles.done]}>{task.name}</Text>

      <View style={styles.lines}>
        <Line icon="calendar-outline">{longDay(task.dueDate)}</Line>
        <Line icon="notifications-outline">{TYPE_LABELS[task.reminderType] ?? 'Reminder'}</Line>
        {task.remindAt && <Line icon="time-outline">At {shortTime(task.remindAt)}</Line>}
        {hasPlace(task) && (
          <Pressable onPress={onShowOnMap}>
            <Line icon="location-outline">
              Within {task.radius} m of its pin <Text style={styles.link}>· show on map</Text>
            </Line>
          </Pressable>
        )}
        {task.triggerLatitude != null && (
          <Line icon="navigate-outline">
            Reminds you {task.triggerRadius} m from a second place
          </Line>
        )}
        {task.complete && <Line icon="checkmark-circle-outline">Done</Line>}
      </View>

      <View style={styles.actions}>
        {!task.complete && (
          <Button
            title="Mark as done"
            onPress={() => run('complete', onComplete)}
            busy={busy === 'complete'}
          />
        )}
        <Button title="Edit" variant="secondary" onPress={onEdit} disabled={busy !== ''} />
        <Button
          title="Delete"
          variant="quietDanger"
          onPress={confirmDelete}
          busy={busy === 'delete'}
          style={styles.delete}
        />
      </View>

      {error !== '' && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 14, color: colours.muted },
  name: { fontSize: 24, fontWeight: '600', color: colours.ink, letterSpacing: -0.4 },
  done: { color: colours.faint, textDecorationLine: 'line-through' },
  lines: { gap: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineText: { fontSize: 15, color: colours.body, flexShrink: 1 },
  link: { color: colours.orange },
  actions: { gap: 8, marginTop: 4 },
  delete: { marginTop: -4 },
  error: { fontSize: 14, color: colours.danger },
});
