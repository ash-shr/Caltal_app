import { useState, useEffect } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import Auth from './Auth';
import TaskList from './TaskList';
import PlaceWatcher from './PlaceWatcher';
import { getStoredUser, logout } from './api';
import { syncTimeReminders, clearTimeReminders } from './timeReminders';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Reading the stored session is async on a phone, so there is a moment at
  // startup where we don't yet know whether anyone is signed in.
  useEffect(() => {
    getStoredUser()
      .then(setUser)
      .finally(() => setChecking(false));
  }, []);

  // Keep the phone's scheduled reminders in step with the server: once on
  // sign-in, and again every time the app comes back to the foreground.
  useEffect(() => {
    if (!user) return;

    const sync = () => syncTimeReminders().catch(() => {
      // Offline, most likely. Whatever was scheduled before stays in place.
    });

    sync();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });

    return () => subscription.remove();
  }, [user]);

  const signOut = async () => {
    // Otherwise the next person to sign in on this phone would get this
    // person's reminders.
    try {
      await clearTimeReminders();
    } catch {
      // Nothing scheduled, or notifications unavailable; nothing to undo
    }

    try {
      await logout();
    } catch {
      // Already signed out locally; nothing useful to show if the server missed it
    }
    setUser(null);
  };

  if (checking) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color="#78716c" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onAuthenticated={setUser} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Caltal</Text>
          <Text style={styles.subtitle}>Signed in as {user.name}</Text>
        </View>

        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <PlaceWatcher />

      <TaskList />

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  centre: {
    flex: 1,
    backgroundColor: '#fafaf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: '#292524',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: '#78716c', marginTop: 2 },
  signOut: { fontSize: 13, color: '#a8a29e', textDecorationLine: 'underline' },
});