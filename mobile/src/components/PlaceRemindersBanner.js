import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { usePlaceReminders } from '../placeReminders';
import { colours } from '../theme';

// Shown above the calendar when there are tasks with a place but place
// reminders are off — otherwise it's easy to pin a task and wonder why the
// phone never says anything when you get there.
//
// onHide: the × was tapped. HomeScreen remembers it, because this banner is
// re-created every time the sheet comes back to the calendar.
export default function PlaceRemindersBanner({ onHide }) {
  const { turnOn, problem } = usePlaceReminders();
  const [busy, setBusy] = useState(false);

  const switchOn = async () => {
    setBusy(true);
    try {
      await turnOn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="location" size={20} color={colours.orange} />
        <Text style={styles.title}>Place reminders are off</Text>
        <Pressable onPress={onHide} hitSlop={10} accessibilityLabel="Hide">
          <Ionicons name="close" size={20} color={colours.faint} />
        </Pressable>
      </View>

      <Text style={styles.body}>
        Turn them on to get a notification when you arrive near a task&apos;s place, even with
        Caltal closed.
      </Text>

      {problem !== '' ? (
        <>
          <Text style={styles.problem}>{problem}</Text>
          <Button
            title="Open phone settings"
            variant="secondary"
            onPress={() => Linking.openSettings()}
          />
        </>
      ) : (
        <Button title="Turn on" onPress={switchOn} busy={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.orangeSoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colours.ink },
  body: { fontSize: 14, color: colours.body, lineHeight: 19 },
  problem: { fontSize: 13, color: colours.danger, lineHeight: 18 },
});
