import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colours } from '../theme';

// A row of buttons where exactly one is chosen — the Place / Time / Both toggle.
export default function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map(option => {
        const chosen = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, chosen && styles.chosen]}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen }}
          >
            <Text style={[styles.label, chosen && styles.chosenLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
    padding: 3,
  },
  option: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 9 },
  chosen: { backgroundColor: colours.ink },
  label: { fontSize: 14, color: colours.muted },
  chosenLabel: { color: '#ffffff' },
});
