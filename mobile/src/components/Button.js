import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colours } from '../theme';

// variant: 'primary' (dark), 'secondary' (outlined), 'danger' (red),
// 'quiet' (grey text only), 'quietDanger' (red text only)
export default function Button({ title, onPress, variant = 'primary', busy = false, disabled = false, style }) {
  const look = looks[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        look.box,
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={look.text.color} />
      ) : (
        <Text style={[styles.text, look.text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dimmed: { opacity: 0.7 },
  text: { fontSize: 15, fontWeight: '500' },
});

const looks = {
  primary: {
    box: { backgroundColor: colours.ink },
    text: { color: '#ffffff' },
  },
  secondary: {
    box: { backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border },
    text: { color: colours.ink },
  },
  danger: {
    box: { backgroundColor: colours.danger },
    text: { color: '#ffffff' },
  },
  quiet: {
    box: { backgroundColor: 'transparent' },
    text: { color: colours.muted },
  },
  quietDanger: {
    box: { backgroundColor: 'transparent' },
    text: { color: colours.danger },
  },
};
