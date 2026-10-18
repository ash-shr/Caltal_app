import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import {
  changePassword,
  deleteAccount,
  getMe,
  sendConfirmationEmail,
  updateName,
} from '../../api';
import { usePlaceReminders } from '../../placeReminders';
import { notificationsAllowed, sendTestReminder } from '../../timeReminders';
import { clearAllReminders } from '../../reminders';
import { useSession } from '../../session';
import { RADIUS_MAX, RADIUS_MIN, useSettings } from '../../settings';
import { colours } from '../../theme';

function Section({ title, children, tone }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, tone === 'danger' && styles.dangerTitle]}>{title}</Text>
      <View style={[styles.card, tone === 'danger' && styles.dangerCard]}>{children}</View>
    </View>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colours.orange, false: colours.border }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function Field(props) {
  return <TextInput placeholderTextColor={colours.faint} style={styles.input} {...props} />;
}

export default function Settings() {
  const { user, setUser } = useSession();
  const { settings, updateSettings } = useSettings();

  // Whether the account has a password (Google-only accounts don't) comes
  // from the server, so the right options can be shown.
  const [me, setMe] = useState(null);
  const [accountError, setAccountError] = useState('');

  // Whether the phone lets Caltal show notifications. Null until known.
  const [notificationsOn, setNotificationsOn] = useState(null);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setAccountError("Your account details couldn't be loaded right now."));

    notificationsAllowed().then(setNotificationsOn).catch(() => {});

    // The confirmation link is opened in the browser. When the person comes
    // back to the app, look again, so "Not confirmed" doesn't linger.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        getMe()
          .then(setMe)
          .catch(() => {
            // Keep showing what was loaded before
          });
        // They may have just switched notifications on in the phone's settings
        notificationsAllowed().then(setNotificationsOn).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  // ---- Test reminder ----
  const [testState, setTestState] = useState({ busy: false, message: '' });

  const sendTest = async () => {
    setTestState({ busy: true, message: '' });
    try {
      if (await sendTestReminder()) {
        setTestState({
          busy: false,
          message:
            'Sent. It should arrive in about a minute, even with your phone locked or Caltal closed.',
        });
      } else {
        setNotificationsOn(false);
        setTestState({ busy: false, message: '' });
      }
    } catch (failure) {
      setTestState({ busy: false, message: failure.message });
    }
  };

  // ---- Email confirmation ----
  const [confirmState, setConfirmState] = useState({ busy: false, sent: false, message: '' });

  const sendConfirmation = async () => {
    setConfirmState({ busy: true, sent: false, message: '' });
    try {
      await sendConfirmationEmail();
      setConfirmState({
        busy: false,
        sent: true,
        message: "Sent. The link opens Caltal's website: sign in there and it's done.",
      });
    } catch (failure) {
      setConfirmState({ busy: false, sent: false, message: failure.message });
    }
  };

  // ---- Name ----
  const [name, setName] = useState(user?.name ?? '');
  const [nameState, setNameState] = useState({ busy: false, message: '' });

  const saveName = async () => {
    setNameState({ busy: true, message: '' });
    try {
      const saved = await updateName(name.trim());
      setUser({ name: saved.name, email: saved.email });
      setNameState({ busy: false, message: 'Saved.' });
    } catch (failure) {
      setNameState({ busy: false, message: failure.message });
    }
  };

  // ---- Password ----
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [passwordState, setPasswordState] = useState({ busy: false, message: '' });

  const savePassword = async () => {
    if (next !== repeat) {
      setPasswordState({ busy: false, message: "The new passwords don't match." });
      return;
    }

    setPasswordState({ busy: true, message: '' });
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setRepeat('');
      setPasswordOpen(false);
      setPasswordState({
        busy: false,
        message: 'Password changed. Every other device has been signed out.',
      });
    } catch (failure) {
      setPasswordState({ busy: false, message: failure.message });
    }
  };

  // ---- Reminders ----
  const placeReminders = usePlaceReminders();

  // The slider moves smoothly on its own copy, and the setting is saved once
  // when the finger lifts, rather than on every step of the drag.
  const [radius, setRadius] = useState(settings.defaultRadius);

  const togglePlaceReminders = on => (on ? placeReminders.turnOn() : placeReminders.turnOff());

  // ---- Delete account ----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteState, setDeleteState] = useState({ busy: false, message: '' });

  const reallyDelete = async () => {
    setDeleteState({ busy: true, message: '' });
    try {
      await deleteAccount(me?.hasPassword === false ? null : deletePassword);
      await clearAllReminders();
      // No user any more: Stack.Protected sends the app back to sign-in.
      setUser(null);
    } catch (failure) {
      setDeleteState({ busy: false, message: failure.message });
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'Your account and every task in it will be removed for good. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: reallyDelete },
      ],
    );
  };

  const hasPassword = me?.hasPassword !== false;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Account">
          <Text style={styles.rowLabel}>Name</Text>
          <Field value={name} onChangeText={setName} maxLength={100} textContentType="name" />
          <Button
            title="Save name"
            variant="secondary"
            onPress={saveName}
            busy={nameState.busy}
            disabled={name.trim() === '' || name.trim() === user?.name}
          />
          {nameState.message !== '' && <Text style={styles.hint}>{nameState.message}</Text>}

          <View style={styles.divider} />

          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>

          {me?.emailVerified === true && (
            <View style={styles.confirmed}>
              <Ionicons name="checkmark-circle" size={16} color={colours.teal} />
              <Text style={styles.confirmedText}>Confirmed</Text>
            </View>
          )}

          {me?.emailVerified === false && (
            <View style={styles.stack}>
              <Text style={styles.hint}>
                {'Not confirmed yet. Confirming it means you can reset your password '
                  + 'by email if you ever forget it.'}
              </Text>
              {!confirmState.sent && (
                <Button
                  title="Send confirmation email"
                  variant="secondary"
                  onPress={sendConfirmation}
                  busy={confirmState.busy}
                />
              )}
              {confirmState.message !== '' && (
                <Text style={confirmState.sent ? styles.hint : styles.warning}>
                  {confirmState.message}
                </Text>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {accountError !== '' ? (
            <Text style={styles.hint}>{accountError}</Text>
          ) : !hasPassword ? (
            <Text style={styles.hint}>
              {"You sign in with Google, so there's no password to change."}
            </Text>
          ) : passwordOpen ? (
            <View style={styles.stack}>
              <Field
                value={current}
                onChangeText={setCurrent}
                placeholder="Current password"
                secureTextEntry
                textContentType="password"
                maxLength={72}
              />
              <Field
                value={next}
                onChangeText={setNext}
                placeholder="New password (8 or more characters)"
                secureTextEntry
                textContentType="newPassword"
                maxLength={72}
              />
              <Field
                value={repeat}
                onChangeText={setRepeat}
                placeholder="New password again"
                secureTextEntry
                textContentType="newPassword"
                maxLength={72}
              />
              <Button title="Change password" onPress={savePassword} busy={passwordState.busy} />
              <Button title="Cancel" variant="quiet" onPress={() => setPasswordOpen(false)} />
            </View>
          ) : (
            <Button
              title="Change password"
              variant="secondary"
              onPress={() => {
                setPasswordState({ busy: false, message: '' });
                setPasswordOpen(true);
              }}
            />
          )}
          {passwordState.message !== '' && (
            <Text style={styles.hint}>{passwordState.message}</Text>
          )}
        </Section>

        <Section title="Reminders">
          <Toggle
            label="Time reminders"
            hint="A notification at the time you set on a task."
            value={settings.timeReminders}
            onChange={on => updateSettings({ timeReminders: on })}
          />
          {settings.timeReminders && notificationsOn === false && (
            <View style={styles.stack}>
              <Text style={styles.warning}>
                Notifications are turned off for Caltal on this phone, so no reminders can appear.
              </Text>
              <Button
                title="Open phone settings"
                variant="secondary"
                onPress={() => Linking.openSettings()}
              />
            </View>
          )}
          {settings.timeReminders && notificationsOn !== false && (
            <View style={styles.stack}>
              <Button
                title="Send a test reminder"
                variant="secondary"
                onPress={sendTest}
                busy={testState.busy}
              />
              {testState.message !== '' && <Text style={styles.hint}>{testState.message}</Text>}
            </View>
          )}

          <View style={styles.divider} />

          <Toggle
            label="Place reminders"
            hint="A notification when you arrive near a task's place, even with the app closed. Needs location set to Always."
            value={settings.placeReminders}
            onChange={togglePlaceReminders}
          />
          {placeReminders.problem !== '' && (
            <View style={styles.stack}>
              <Text style={styles.warning}>{placeReminders.problem}</Text>
              <Button
                title="Open phone settings"
                variant="secondary"
                onPress={() => Linking.openSettings()}
              />
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.radiusHeader}>
            <Text style={styles.rowLabel}>Default reminder radius</Text>
            <Text style={styles.value}>{radius} m</Text>
          </View>
          <Text style={styles.hint}>Where new place tasks start. You can still change it per task.</Text>
          <Slider
            minimumValue={RADIUS_MIN}
            maximumValue={RADIUS_MAX}
            step={10}
            value={radius}
            onValueChange={setRadius}
            onSlidingComplete={value => updateSettings({ defaultRadius: value })}
            minimumTrackTintColor={colours.orange}
            maximumTrackTintColor={colours.border}
            thumbTintColor={colours.ink}
          />
        </Section>

        <Section title="Delete account" tone="danger">
          {!deleteOpen ? (
            <>
              <Text style={styles.hint}>
                Removes your account and all of your tasks from Caltal permanently.
              </Text>
              <Button title="Delete my account" variant="quietDanger" onPress={() => setDeleteOpen(true)} />
            </>
          ) : (
            <View style={styles.stack}>
              {hasPassword && (
                <Field
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Type your password to confirm"
                  secureTextEntry
                  textContentType="password"
                  maxLength={72}
                />
              )}
              <Button
                title="Delete my account for good"
                variant="danger"
                onPress={confirmDelete}
                busy={deleteState.busy}
                disabled={hasPassword && deletePassword === ''}
              />
              <Button title="Keep my account" variant="quiet" onPress={() => setDeleteOpen(false)} />
              {deleteState.message !== '' && (
                <Text style={styles.warning}>{deleteState.message}</Text>
              )}
            </View>
          )}
        </Section>

        <Text style={styles.version}>Caltal {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colours.background },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colours.faint,
    marginLeft: 4,
  },
  dangerTitle: { color: colours.danger },
  card: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  dangerCard: { borderColor: '#fecaca', backgroundColor: colours.dangerSoft },
  rowLabel: { fontSize: 15, color: colours.ink, fontWeight: '500' },
  value: { fontSize: 15, color: colours.body },
  hint: { fontSize: 13, color: colours.muted, lineHeight: 18 },
  warning: { fontSize: 13, color: colours.danger, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colours.ink,
  },
  divider: { height: 1, backgroundColor: colours.border, marginVertical: 4 },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmedText: { fontSize: 13, color: colours.teal, fontWeight: '500' },
  stack: { gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1, gap: 2 },
  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  version: { textAlign: 'center', fontSize: 12, color: colours.faint },
});
