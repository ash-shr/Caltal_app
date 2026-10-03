import { useState } from 'react';
import {
  Image,
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
import Splash from '../components/Splash';
import { login, register } from '../api';
import { useSession } from '../session';
import { colours } from '../theme';

export default function SignIn() {
  const { setUser } = useSession();

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signingUp = mode === 'register';

  const submit = async () => {
    setError('');
    setBusy(true);

    try {
      const result = signingUp
        ? await register(email.trim(), password, name.trim())
        : await login(email.trim(), password);

      // Setting the user flips Stack.Protected in the root layout, which
      // swaps this screen for the map on its own — no navigate() needed.
      setUser({ name: result.name, email: result.email });
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
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
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            accessibilityLabel="Caltal logo"
          />

          <Text style={styles.title}>Caltal</Text>
          <Text style={styles.subtitle}>
            {signingUp ? 'Create an account' : 'Welcome back'}
          </Text>

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

            <Button title={signingUp ? 'Sign up' : 'Sign in'} onPress={submit} />

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={() => setMode(signingUp ? 'login' : 'register')}>
              <Text style={styles.switch}>
                {signingUp ? 'I already have an account' : 'I need an account'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* The same peeling orange as start-up, while the server answers */}
      {busy && <Splash />}
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
  logo: { width: 132, height: 132, alignSelf: 'center', marginBottom: 12 },
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
  switch: { color: colours.muted, fontSize: 14, textAlign: 'center', marginTop: 8 },
});
