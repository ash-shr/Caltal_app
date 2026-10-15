import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaces } from '../geo';
import { colours, floating } from '../theme';

const MIN_LETTERS = 3;

// Wait this long after the last keypress before searching, so typing
// "Leeds station" sends one request rather than thirteen.
const PAUSE_MS = 350;

// getNear: returns { latitude, longitude } of the map's centre, to bias results
// saved: the person's saved places, listed first (all of them before typing)
// onSelect: a result was chosen
// onClear: the search was emptied
// onFocus: the box was tapped (HomeScreen lowers the sheet to make room)
export default function SearchBar({ getNear, saved = [], onSelect, onClear, onFocus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [noMatches, setNoMatches] = useState(false);
  const [open, setOpen] = useState(false);

  // Saved places whose name contains what's typed; all of them before typing
  const typed = query.trim().toLowerCase();
  const savedMatches = saved.filter(place => place.name.toLowerCase().includes(typed));

  // Set when a result is picked, so filling the box with its name doesn't
  // immediately search for that name again.
  const justPicked = useRef(false);

  const changeText = text => {
    setQuery(text);
    setOpen(true);
    if (text.trim().length < MIN_LETTERS) {
      setResults([]);
      setError('');
      setNoMatches(false);
    }
  };

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return undefined;
    }
    if (query.trim().length < MIN_LETTERS) {
      return undefined;
    }

    // An AbortController cancels a request that's still running when a newer
    // one starts, so a slow early answer can't overwrite a later one.
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const near = await getNear();
        const found = await searchPlaces(query.trim(), near, controller.signal);
        setResults(found);
        setError('');
        setNoMatches(found.length === 0);
      } catch (failure) {
        if (failure.name !== 'AbortError') {
          setError(failure.message);
        }
      } finally {
        setSearching(false);
      }
    }, PAUSE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, getNear]);

  const pick = place => {
    // Only when the text will actually change. If it won't, the effect below
    // doesn't run to reset the flag, and the next real search would be skipped.
    if (place.name !== query) {
      justPicked.current = true;
    }
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    Keyboard.dismiss();
    onSelect(place);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setError('');
    setNoMatches(false);
    setOpen(false);
    Keyboard.dismiss();
    onClear?.();
  };

  // "No places found" only when nothing at all matched, saved places included
  const message = error !== '' ? error : noMatches && savedMatches.length === 0 ? 'No places found.' : '';
  const showList = open && (savedMatches.length > 0 || results.length > 0 || message !== '');

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Ionicons name="search" size={18} color={colours.faint} />

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={changeText}
          onFocus={() => {
            setOpen(true);
            onFocus?.();
          }}
          // Tapping the map hides the keyboard; the list goes with it
          onBlur={() => setOpen(false)}
          // Pressing Search keeps the keyboard up while results arrive
          submitBehavior="submit"
          placeholder="Search places"
          placeholderTextColor={colours.faint}
          returnKeyType="search"
          autoCorrect={false}
          maxLength={120}
        />

        {searching ? (
          <ActivityIndicator size="small" color={colours.faint} />
        ) : query !== '' ? (
          <Pressable onPress={clear} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colours.faint} />
          </Pressable>
        ) : null}
      </View>

      {showList && (
        // Scrolls once there are more results than fit. "handled" lets a tap
        // on a result go straight to it, instead of the first tap only
        // closing the keyboard.
        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        >
          {savedMatches.map(place => (
            <Pressable
              key={`saved-${place.id}`}
              onPress={() => pick(place)}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
            >
              <Ionicons name="bookmark" size={18} color={colours.orange} />
              <View style={styles.resultText}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {place.address ?? 'Saved place'}
                </Text>
              </View>
            </Pressable>
          ))}

          {message !== '' ? (
            <Text style={styles.message}>{message}</Text>
          ) : (
            results.map(place => (
              <Pressable
                key={place.id}
                onPress={() => pick(place)}
                style={({ pressed }) => [styles.result, pressed && styles.pressed]}
              >
                <Ionicons name="location-outline" size={18} color={colours.muted} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colours.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    ...floating,
  },
  input: { flex: 1, fontSize: 15, color: colours.ink, paddingVertical: 0 },
  results: {
    marginTop: 8,
    maxHeight: 300,
    backgroundColor: colours.surface,
    borderRadius: 14,
    ...floating,
  },
  resultsContent: { paddingVertical: 6 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: colours.background },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, color: colours.ink },
  resultAddress: { fontSize: 12, color: colours.faint, marginTop: 1 },
  message: { fontSize: 14, color: colours.muted, paddingHorizontal: 14, paddingVertical: 10 },
});
