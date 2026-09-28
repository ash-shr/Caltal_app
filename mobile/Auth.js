import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login, register } from './api';

export default function Auth({ onAuthenticated }) {
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

      onAuthenticated({ name: result.name, email: result.email });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Caltal</Text>
        <Text style={styles.subtitle}>
          {signingUp ? 'Create an account' : 'Welcome back'}
        </Text>

        {signingUp && (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#a8a29e"
          />
        )}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@mail.com"
          placeholderTextColor="#a8a29e"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#a8a29e"
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {busy ? 'Just a moment…' : signingUp ? 'Sign up' : 'Sign in'}
          </Text>
        </Pressable>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={() => setMode(signingUp ? 'login' : 'register')}>
          <Text style={styles.switch}>
            {signingUp ? 'I already have an account' : 'I need an account'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  form: { gap: 12 },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: '#292524',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: '#78716c', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#292524',
  },
  button: {
    backgroundColor: '#292524',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  error: { color: '#dc2626', fontSize: 14 },
  switch: {
    color: '#78716c',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});