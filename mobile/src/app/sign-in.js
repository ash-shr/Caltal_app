import { useState } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import {
  confirmWithCode,
  login,
  loginWithGoogle,
  register,
  requestPasswordReset,
  resendCode,
} from '../api';
import { chooseGoogleAccount, googleSignInAvailable } from '../google';
import { useSession } from '../session';
import { colours } from '../theme';

// How much of the form stays in view below the box being typed in, above the
// keyboard: enough to see the next box or the button
const KEYBOARD_GAP = 96;

// Signing up (or in, to an account not yet confirmed) didn't sign in: the
// server wants the code it has emailed first
class NeedsCode extends Error {
  constructor(email) {
    super('Enter the code from your email');
    this.email = email;
  }
}

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

  // Confirming the email: the address the code went to, what's been typed,
  // and where the person came from (to go back to)
  const [codeFor, setCodeFor] = useState('');
  const [code, setCode] = useState('');
  const [cameFrom, setCameFrom] = useState('register');
  const [codeNotice, setCodeNotice] = useState('');

  const signingUp = mode === 'register';
  const forgot = mode === 'forgot';
  const enteringCode = mode === 'code';

  const switchTo = next => {
    setMode(next);
    setError('');
    setResetSentTo('');
    setCodeNotice('');
  };

  const confirm = async typed => {
    setError('');
    setCodeNotice('');
    Keyboard.dismiss();
    try {
      await signIn(() => confirmWithCode(codeFor, password, typed));
    } catch (failure) {
      setError(failure.message);
    }
  };

  // Only digits, and as soon as all six are there, check them
  const typeCode = text => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      confirm(digits);
    }
  };

  const sendNewCode = async () => {
    setError('');
    setCodeNotice('');
    setBusy(true);
    try {
      await resendCode(codeFor, password);
      setCode('');
      setCodeNotice('A new code is on its way. Any earlier code no longer works.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
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

  // Google's account picker first; then the same sign-in as with a password,
  // splash and all. Closing the picker just leaves things as they were.
  const continueWithGoogle = async () => {
    setError('');
    Keyboard.dismiss();

    let idToken;
    try {
      idToken = await chooseGoogleAccount();
    } catch (failure) {
      setError(failure.message);
      return;
    }
    if (!idToken) {
      return;
    }

    try {
      await signIn(() => loginWithGoogle(idToken));
    } catch (failure) {
      setError(failure.message);
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
      await signIn(async () => {
        const result = signingUp
          ? await register(email.trim(), password, name.trim())
          : await login(email.trim(), password);
        if (result.confirmEmail) {
          throw new NeedsCode(result.email);
        }
        return result;
      });
    } catch (failure) {
      if (failure instanceof NeedsCode) {
        // Not signed in yet: the email has to be confirmed first
        setCameFrom(mode);
        setCodeFor(failure.email);
        setCode('');
        switchTo('code');
        return;
      }
      setError(failure.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Scrolls the box being typed in, plus a little room below it, into
          view above the keyboard */}
      <KeyboardAwareScrollView
        style={styles.safe}
        contentContainerStyle={styles.container}
        bottomOffset={KEYBOARD_GAP}
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
            {enteringCode
              ? 'Confirm your email'
              : forgot
                ? 'Forgot your password?'
                : signingUp
                  ? 'Create an account'
                  : 'Welcome back'}
          </Text>

          {enteringCode ? (
            <View style={styles.form}>
              <Text style={styles.explain}>
                {`We've sent a 6-digit code to ${codeFor}. Enter it below. It can take a `
                  + 'minute to arrive, so check your spam folder too.'}
              </Text>

              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={typeCode}
                placeholder="000000"
                placeholderTextColor={colours.faint}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                maxLength={6}
                accessibilityLabel="Code from the email"
              />

              <Button
                title="Confirm"
                onPress={() => confirm(code)}
                disabled={code.length !== 6}
              />

              {codeNotice !== '' && <Text style={styles.explain}>{codeNotice}</Text>}
              {error !== '' && <Text style={styles.error}>{error}</Text>}

              <View style={styles.codeLinks}>
                <Pressable onPress={sendNewCode} disabled={busy} hitSlop={8}>
                  <Text style={styles.codeLink}>{busy ? 'Sending…' : 'Send a new code'}</Text>
                </Pressable>
                <Pressable onPress={() => switchTo(cameFrom)} hitSlop={8}>
                  <Text style={styles.codeLink}>Use a different email</Text>
                </Pressable>
              </View>
            </View>
          ) : forgot ? (
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
              {googleSignInAvailable && (
                <>
                  <Pressable
                    onPress={continueWithGoogle}
                    style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="logo-google" size={18} color={colours.ink} />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </Pressable>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or with your email</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

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
      </KeyboardAwareScrollView>
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
  codeInput: { fontSize: 26, letterSpacing: 10, textAlign: 'center', fontWeight: '600' },
  codeLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  codeLink: { color: colours.orange, fontSize: 14, fontWeight: '500' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  googleText: { fontSize: 15, fontWeight: '600', color: colours.ink },
  pressed: { opacity: 0.7 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colours.border },
  dividerText: { fontSize: 13, color: colours.faint },
});
