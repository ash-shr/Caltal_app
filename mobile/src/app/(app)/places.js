import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { usePlaces } from '../../places';
import { colours } from '../../theme';

const MAX_PLACES = 20;

function PlaceRow({ place }) {
  const { rename, remove } = usePlaces();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    // The keyboard's Done key comes here too, without the button's checks
    if (busy || name.trim() === '') {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await rename(place, name.trim());
      setEditing(false);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  // Tasks keep their own copy of where they are, so deleting a place leaves
  // the tasks pinned there exactly as they were.
  const confirmDelete = () => {
    Alert.alert(
      `Delete ${place.name}?`,
      'Tasks you already pinned here stay where they are.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => remove(place.id).catch(failure => setError(failure.message)),
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      {editing ? (
        <View style={styles.stack}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={50}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <View style={styles.buttons}>
            <Button
              title="Save"
              onPress={save}
              busy={busy}
              disabled={name.trim() === ''}
              style={styles.flex}
            />
            <Button
              title="Cancel"
              variant="quiet"
              onPress={() => {
                setName(place.name);
                setEditing(false);
                setError('');
              }}
              style={styles.flex}
            />
          </View>
        </View>
      ) : (
        <View style={styles.line}>
          <Ionicons name="bookmark" size={20} color={colours.orange} />
          <View style={styles.flex}>
            <Text style={styles.name}>{place.name}</Text>
            {place.address ? (
              <Text style={styles.address} numberOfLines={1}>
                {place.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityLabel="Rename">
            <Ionicons name="pencil" size={18} color={colours.muted} />
          </Pressable>
          <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={18} color={colours.danger} />
          </Pressable>
        </View>
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export default function SavedPlaces() {
  const { places, error, refresh } = usePlaces();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error !== '' ? (
        <Pressable onPress={refresh}>
          <Text style={styles.error}>{`Couldn't load your places: ${error} Tap to try again.`}</Text>
        </Pressable>
      ) : places.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={32} color={colours.faint} />
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptyText}>
            Search for a place on the map and tap Save place. Or, while adding a task, tap
            &ldquo;Save this place for next time&rdquo;.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>
            {places.length} of {MAX_PLACES}
          </Text>
          {places.map(place => (
            <PlaceRow key={place.id} place={place} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 48 },
  count: { fontSize: 12, color: colours.faint, marginLeft: 4 },
  row: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  name: { fontSize: 16, color: colours.ink, fontWeight: '500' },
  address: { fontSize: 13, color: colours.muted, marginTop: 2 },
  stack: { gap: 10 },
  buttons: { flexDirection: 'row', gap: 8 },
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
  error: { fontSize: 13, color: colours.danger, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colours.ink },
  emptyText: { fontSize: 14, color: colours.muted, textAlign: 'center', lineHeight: 20 },
});
