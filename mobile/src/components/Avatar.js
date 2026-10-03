import { StyleSheet, Text, View } from 'react-native';
import { colours } from '../theme';

// 'Lucki Sharma' → 'LS', 'Ash' → 'A'
export function initials(name) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

export default function Avatar({ name, size = 40 }) {
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.letters, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colours.orangeSoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letters: { color: '#9a3412', fontWeight: '600' },
});
