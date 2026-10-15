import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from './Button';
import { SUGGESTED_NAMES, usePlaces } from '../places';
import { colours, floating } from '../theme';

// Asks for a name and saves a spot as a place. `spot` is
// { latitude, longitude, name?, address? } — the name, if it came from a
// search result, is offered as a starting point.
//
// The parent shows it by rendering it and hides it by not rendering it, so
// each time it opens it starts fresh with the new spot's name.
export default function SavePlaceModal({ spot, onClose, onSaved }) {
  const { places, save } = usePlaces();
  const [name, setName] = useState(spot.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Only suggest names that aren't taken yet
  const taken = new Set(places.map(place => place.name.toLowerCase()));
  const suggestions = SUGGESTED_NAMES.filter(suggestion => !taken.has(suggestion.toLowerCase()));

  const submit = async () => {
    // The keyboard's Done key comes here too, without the button's checks
    if (busy || name.trim() === '') {
      return;
    }
    setError('');
    setBusy(true);
    try {
      const saved = await save({
        name: name.trim(),
        latitude: spot.latitude,
        longitude: spot.longitude,
        address: spot.address ?? null,
      });
      onSaved?.(saved);
      onClose();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Save this place</Text>
          {spot.address ? (
            <Text style={styles.address} numberOfLines={2}>
              {spot.address}
            </Text>
          ) : null}

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name it, like Home or Gym"
            placeholderTextColor={colours.faint}
            maxLength={50}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {suggestions.length > 0 && (
            <View style={styles.chips}>
              {suggestions.map(suggestion => (
                <Pressable
                  key={suggestion}
                  onPress={() => setName(suggestion)}
                  style={[styles.chip, name === suggestion && styles.chipChosen]}
                >
                  <Text style={[styles.chipText, name === suggestion && styles.chipTextChosen]}>
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <Button title="Save place" onPress={submit} busy={busy} disabled={name.trim() === ''} />
          <Button title="Cancel" variant="quiet" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Near the top rather than centred, so the keyboard can never cover the
  // buttons, whatever the phone does about resizing for it.
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  card: {
    backgroundColor: colours.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    ...floating,
  },
  title: { fontSize: 18, fontWeight: '600', color: colours.ink },
  address: { fontSize: 13, color: colours.muted, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colours.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipChosen: { backgroundColor: colours.ink, borderColor: colours.ink },
  chipText: { fontSize: 14, color: colours.body },
  chipTextChosen: { color: '#ffffff' },
  error: { fontSize: 14, color: colours.danger },
});
