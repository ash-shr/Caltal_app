import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shortTime } from '../dates';
import { hasPlace } from '../tasks';
import { colours } from '../theme';

function describe(task) {
  const parts = [];

  if (task.remindAt) {
    parts.push(shortTime(task.remindAt));
  }
  if (hasPlace(task)) {
    parts.push(`${task.radius} m radius`);
  }
  if (task.triggerLatitude != null) {
    parts.push('reminds you elsewhere');
  }

  return parts.join(' · ');
}

// The tasks on one day. Finished ones sink to the bottom.
export default function DayTasks({ tasks, onOpen, onComplete }) {
  if (tasks.length === 0) {
    return (
      <Text style={styles.empty}>
        Nothing on this day. Tap + to add a task, or press and hold anywhere on the map.
      </Text>
    );
  }

  const ordered = [...tasks].sort((a, b) => Number(a.complete) - Number(b.complete));

  return (
    <View style={styles.list}>
      {ordered.map(task => (
        <Pressable
          key={task.id}
          onPress={() => onOpen(task)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Pressable
            onPress={() => !task.complete && onComplete(task)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.complete }}
            accessibilityLabel={`Mark ${task.name} as done`}
          >
            <Ionicons
              name={task.complete ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={task.complete ? colours.faint : colours.orange}
            />
          </Pressable>

          <View style={styles.text}>
            <Text style={[styles.name, task.complete && styles.done]} numberOfLines={1}>
              {task.name}
            </Text>
            {describe(task) !== '' && <Text style={styles.meta}>{describe(task)}</Text>}
          </View>

          <Ionicons
            name={hasPlace(task) ? 'location-outline' : 'time-outline'}
            size={18}
            color={colours.faint}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.8 },
  text: { flex: 1 },
  name: { fontSize: 15, color: colours.ink },
  done: { color: colours.faint, textDecorationLine: 'line-through' },
  meta: { fontSize: 12, color: colours.faint, marginTop: 2 },
  empty: { fontSize: 14, color: colours.faint, lineHeight: 20 },
});
