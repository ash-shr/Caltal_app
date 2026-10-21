import { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { login, register, requestPasswordReset } from '../api';
import { useSession } from '../session';
import { colours } from '../theme';

export default function SignIn() {
  const { signIn } = useSession();

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The address a reset link was asked for, once it has been
  const [resetSentTo, setResetSentTo] = useState('');

  const signingUp = mode === 'register';
  const forgot = mode === 'forgot';

  const switchTo = next => {
    setMode(next);
    setError('');
    setResetSentTo('');
  };

  const sendResetLink = async () => {
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setResetSentTo(email.trim());
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    // The splash covers the whole screen; the keyboard would sit on top of it
    Keyboard.dismiss();

    try {
      // signIn shows the peeling orange over everything while the server
      // answers. Then setting the user flips Stack.Protected in the root
      // layout, which swaps this screen for the map on its own (no navigate()
      // needed), and the splash stays until the map has the tasks.
      await signIn(() =>
        signingUp
          ? register(email.trim(), password, name.trim())
          : login(email.trim(), password),
      );
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            accessibilityLabel="Caltal logo"
          />

          <Text style={styles.title}>Caltal</Text>
          <Text style={styles.subtitle}>
            {forgot ? 'Forgot your password?' : signingUp ? 'Create an account' : 'Welcome back'}
          </Text>

          {forgot ? (
            <View style={styles.form}>
              {resetSentTo !== '' ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>Check your email</Text>
                  <Text style={styles.noticeText}>
                    {`If there's a Caltal account for ${resetSentTo}, a link to choose a new `
                      + "password is on its way. It opens Caltal's website and works for one "
                      + 'hour. Then come back here and sign in with your new password.'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.explain}>
                    {"Enter your account's email address and we'll send you a link to "
                      + 'choose a new password.'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@mail.com"
                    placeholderTextColor={colours.faint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={254}
                    textContentType="emailAddress"
                  />

                  <Button title="Send reset link" onPress={sendResetLink} busy={busy} />
                </>
              )}

              {error !== '' && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={() => switchTo('login')}>
                <Text style={styles.switch}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              {signingUp && (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colours.faint}
                  maxLength={100}
                  textContentType="name"
                />
              )}

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@mail.com"
                placeholderTextColor={colours.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                textContentType="emailAddress"
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colours.faint}
                secureTextEntry
                maxLength={72}
                textContentType={signingUp ? 'newPassword' : 'password'}
              />

              {!signingUp && (
                <Pressable
                  onPress={() => switchTo('forgot')}
                  hitSlop={8}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              <Button title={signingUp ? 'Sign up' : 'Sign in'} onPress={submit} />

              {error !== '' && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={() => switchTo(signingUp ? 'login' : 'register')}>
                <Text style={styles.switch}>
                  {signingUp ? 'I already have an account' : 'I need an account'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  // The orange fills its image edge to edge, so this is the size it shows at
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colours.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: colours.muted, textAlign: 'center', marginTop: 4 },
  form: { gap: 12, marginTop: 28 },
  input: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colours.ink,
  },
  error: { color: colours.danger, fontSize: 14 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: colours.muted, fontSize: 13 },
  explain: { fontSize: 14, color: colours.body, lineHeight: 20 },
  notice: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  noticeTitle: { fontSize: 15, fontWeight: '600', color: colours.ink },
  noticeText: { fontSize: 14, color: colours.body, lineHeight: 20 },
  switch: { color: colours.muted, fontSize: 14, textAlign: 'center', marginTop: 8 },
});
