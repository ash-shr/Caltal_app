import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getTasksOnDate } from './api';
import { syncTimeReminders } from './timeReminders';

// toISOString() converts to UTC first, which in British Summer Time can roll the
// date back a day. Build the string from local parts instead.
function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await getTasksOnDate(isoDate(new Date()));
      setTasks(result);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Pulling to refresh also picks up timed tasks added on the website since the
  // app was opened, and schedules their reminders.
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), syncTimeReminders().catch(() => {})]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color="#78716c" />
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={task => String(task.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#78716c" />
      }
      ListHeaderComponent={
        <Text style={styles.heading}>
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      }
      ListEmptyComponent={
        error !== '' ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.empty}>Nothing scheduled today.</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={[styles.name, item.complete && styles.done]}>{item.name}</Text>

          <View style={styles.meta}>
            {item.remindAt && <Text style={styles.metaText}>{item.remindAt.slice(0, 5)}</Text>}
            {item.radius != null && <Text style={styles.metaText}>{item.radius}m radius</Text>}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 8 },
  heading: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#a8a29e',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: { fontSize: 15, color: '#292524' },
  done: { color: '#a8a29e', textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaText: { fontSize: 12, color: '#a8a29e' },
  empty: { fontSize: 14, color: '#a8a29e' },
  error: { fontSize: 14, color: '#dc2626' },
});
