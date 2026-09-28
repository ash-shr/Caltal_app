import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getAllTasks } from './api';
import { GEOFENCE_TASK, requestPermissions, watchPlaces, stopWatching } from './geofencing';

// Without this, a notification arriving while the app is open is delivered
// silently — the OS assumes the app will show it itself.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PlaceWatcher() {
  const [watching, setWatching] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Geofences survive the app being closed, so on startup we ask the OS
  // whether ours are already registered rather than assuming they are not.
  useEffect(() => {
    TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK).then(setWatching);
  }, []);

  const start = async () => {
    setBusy(true);
    setMessage('');

    try {
      const permission = await requestPermissions();

      if (!permission.ok) {
        setMessage(permission.reason);
        return;
      }

      const tasks = await getAllTasks();
      const registered = await watchPlaces(tasks);

      if (registered === 0) {
        setMessage('No tasks with a place on them yet.');
        return;
      }

      setCount(registered);
      setWatching(true);
    } catch (failure) {
      setMessage(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    await stopWatching();
    setWatching(false);
    setCount(0);
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      {busy ? (
        <ActivityIndicator color="#78716c" />
      ) : watching ? (
        <Pressable onPress={stop} style={styles.active}>
          <View style={styles.dot} />
          <Text style={styles.activeText}>
            Watching{count > 0 ? ` ${count} place${count === 1 ? '' : 's'}` : ''} — tap to stop
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={start}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Watch my places</Text>
        </Pressable>
      )}

      {message !== '' && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 20, gap: 8 },
  button: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: { opacity: 0.8 },
  buttonText: { fontSize: 15, color: '#57534e' },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#292524',
    borderRadius: 12,
    paddingVertical: 14,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a8a29e' },
  activeText: { fontSize: 15, color: '#ffffff' },
  message: { fontSize: 13, color: '#dc2626', lineHeight: 18 },
});
