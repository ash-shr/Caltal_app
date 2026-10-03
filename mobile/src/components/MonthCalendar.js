import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fromIsoDate, monthGrid, today } from '../dates';
import { colours } from '../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// marks: { '2026-10-02': 'open' | 'done' } — which days get a dot, and whether
// everything on that day is already finished.
export default function MonthCalendar({ selected, onSelect, marks }) {
  const selectedDate = fromIsoDate(selected);
  const [shown, setShown] = useState({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
  });

  // If something else changes the selected day (opening a task from a map pin,
  // say) to a day in another month, follow it there. Adjusting state while
  // rendering, rather than in an effect, avoids drawing the wrong month first.
  const [followed, setFollowed] = useState(selected);
  if (followed !== selected) {
    setFollowed(selected);
    setShown({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() });
  }

  const step = by => {
    setShown(current => {
      const moved = new Date(current.year, current.month + by, 1);
      return { year: moved.getFullYear(), month: moved.getMonth() };
    });
  };

  const title = new Date(shown.year, shown.month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const todayText = today();

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.arrows}>
          <Pressable onPress={() => step(-1)} hitSlop={10} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={colours.muted} />
          </Pressable>
          <Pressable onPress={() => step(1)} hitSlop={10} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={colours.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((letter, index) => (
          <Text key={index} style={styles.weekday}>
            {letter}
          </Text>
        ))}
      </View>

      {monthGrid(shown.year, shown.month).map((week, index) => (
        <View key={index} style={styles.row}>
          {week.map((day, column) => {
            if (day === null) {
              return <View key={column} style={styles.cell} />;
            }

            const isSelected = day === selected;
            const isToday = day === todayText;
            const mark = marks[day];

            return (
              <Pressable
                key={day}
                style={styles.cell}
                onPress={() => onSelect(day)}
                accessibilityLabel={fromIsoDate(day).toDateString()}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.day, isSelected && styles.selectedDay]}>
                  <Text
                    style={[
                      styles.number,
                      isToday && styles.today,
                      isSelected && styles.selectedNumber,
                    ]}
                  >
                    {Number(day.slice(8))}
                  </Text>
                </View>

                <View
                  style={[
                    styles.dot,
                    mark === 'open' && styles.openDot,
                    mark === 'done' && styles.doneDot,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '600', color: colours.ink, letterSpacing: -0.3 },
  arrows: { flexDirection: 'row', gap: 22 },
  row: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colours.faint,
    marginBottom: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: { backgroundColor: colours.ink },
  number: { fontSize: 15, color: colours.ink },
  today: { color: colours.orange, fontWeight: '700' },
  selectedNumber: { color: '#ffffff', fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  openDot: { backgroundColor: colours.orange },
  doneDot: { backgroundColor: colours.border },
});
