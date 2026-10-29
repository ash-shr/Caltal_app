import { useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { askForExactReminders, exactRemindersAllowed } from '../exactReminders';
import { reminderChannel } from '../notificationChannel';
import { usePlaceReminders } from '../placeReminders';
import { useSettings } from '../settings';
import { colours } from '../theme';

// Shown once on each phone, the first time the map opens after signing in:
// what Caltal needs and why, then every question one after another. Without
// these, reminders quietly don't arrive, and people only find out when one
// is missed.
//
// The order matters:
//   1. Location, then notifications, through the same steps as switching
//      place reminders on in Settings. Google Play wants its own explanation
//      (LOCATION_NOTICE) straight before the phone asks for background
//      location, and those steps show it. If the person says no along the
//      way, whatever is still unasked of notifications and "while using the
//      app" location (for the map) is asked on its own, never twice.
//   2. Alarms & reminders (Android 12+), last, because it's a switch on a
//      page of the phone's settings rather than a question
//
// The microphone isn't asked for here: it's asked the first time someone
// records a voice note, when the reason is obvious.
export default function PermissionsSetup({ visible }) {
  const insets = useSafeAreaInsets();
  const { updateSettings } = useSettings();
  const { turnOn: turnOnPlaceReminders } = usePlaceReminders();
  const [busy, setBusy] = useState(false);

  const done = () => updateSettings({ setupShown: true });

  const setUp = async () => {
    setBusy(true);
    try {
      const placesOn = await turnOnPlaceReminders();

      if (!placesOn) {
        const notifications = await Notifications.getPermissionsAsync();
        if (notifications.status === 'undetermined') {
          // Android 13+ only asks once there's a notification channel
          await reminderChannel();
          await Notifications.requestPermissionsAsync();
        }

        const foreground = await Location.getForegroundPermissionsAsync();
        if (foreground.status === 'undetermined') {
          await Location.requestForegroundPermissionsAsync();
        }
      }

      if (!exactRemindersAllowed()) {
        askForExactReminders();
      }
    } catch {
      // A question that couldn't be asked is left for Settings
    } finally {
      setBusy(false);
      done();
    }
  };

  const steps = [
    {
      icon: 'location-outline',
      title: 'Location, all the time',
      text:
        'To remind you when you arrive near a task’s place, even with Caltal closed. ' +
        'Your location stays on your phone.',
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      text: 'So your reminders can appear.',
    },
    ...(Platform.OS === 'android' && !exactRemindersAllowed()
      ? [
          {
            icon: 'alarm-outline',
            title: 'Alarms & reminders',
            text: 'So reminders with a time come on the minute, not late.',
          },
        ]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={done}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.title}>Set up your reminders</Text>
        <Text style={styles.intro}>
          Caltal needs your OK for a few things. Your phone will ask about each one in turn.
        </Text>

        <View style={styles.steps}>
          {steps.map(step => (
            <View key={step.title} style={styles.step}>
              <View style={styles.icon}>
                <Ionicons name={step.icon} size={22} color={colours.orange} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <Button title="Continue" onPress={setUp} busy={busy} />
          <Button title="Not now" variant="quiet" onPress={done} disabled={busy} />
        </View>

        <Text style={styles.footer}>You can change any of these later in Settings.</Text>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { paddingHorizontal: 24, gap: 16 },
  logo: { width: 72, height: 72, alignSelf: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colours.ink,
    textAlign: 'center',
  },
  intro: { fontSize: 15, lineHeight: 22, color: colours.body, textAlign: 'center' },
  steps: { gap: 12, marginTop: 8 },
  step: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colours.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 4 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: colours.ink },
  stepBody: { fontSize: 14, lineHeight: 20, color: colours.body },
  buttons: { gap: 8, marginTop: 8 },
  footer: { fontSize: 13, color: colours.faint, textAlign: 'center' },
});
