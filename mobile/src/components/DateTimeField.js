import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fromIsoDate, isoDate, shortDay } from '../dates';
import { colours } from '../theme';

// The pickers work with Date objects; the server wants strings. These convert
// between the two. mode 'date' ↔ 'YYYY-MM-DD', mode 'time' ↔ 'HH:MM'.
function toDate(mode, value) {
  if (mode === 'date') {
    return fromIsoDate(value);
  }
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function fromDate(mode, date) {
  if (mode === 'date') {
    return isoDate(date);
  }
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

// One labelled row with a date or time picker. iOS has a neat inline "pill"
// that opens the picker in place; Android has no inline picker, so tapping
// the row opens the system dialog instead.
export default function DateTimeField({ label, mode, value, onChange }) {
  const current = toDate(mode, value);
  const choose = (_event, picked) => onChange(fromDate(mode, picked));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={current}
          mode={mode}
          display="compact"
          locale="en-GB"
          themeVariant="light"
          accentColor={colours.orange}
          onValueChange={choose}
        />
      ) : (
        <Pressable
          style={styles.androidValue}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: current,
              mode,
              is24Hour: true,
              onValueChange: choose,
            })
          }
        >
          <Text style={styles.androidText}>{mode === 'date' ? shortDay(value) : value}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 52,
  },
  label: { fontSize: 15, color: colours.body },
  androidValue: {
    backgroundColor: colours.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  androidText: { fontSize: 15, color: colours.ink },
});
