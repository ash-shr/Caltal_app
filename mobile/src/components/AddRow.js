import { Keyboard, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../theme';

// A dashed "+ Add a time" style button for a part of a task that's optional.
// None of them need typing, so pressing one puts the keyboard away.
export default function AddRow({ icon, label, hint, onPress }) {
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={colours.orange} />
      <Text style={styles.addLabel}>{label}</Text>
      {hint && <Text style={styles.addHint}>{hint}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colours.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  pressed: { opacity: 0.7 },
  addLabel: { fontSize: 15, color: colours.ink },
  addHint: { fontSize: 13, color: colours.faint },
});
