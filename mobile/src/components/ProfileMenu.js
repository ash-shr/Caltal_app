import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { colours, floating } from '../theme';

function Row({ icon, label, onPress, tone = 'normal' }) {
  const colour = tone === 'danger' ? colours.danger : colours.ink;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={colour} />
      <Text style={[styles.rowText, { color: colour }]}>{label}</Text>
    </Pressable>
  );
}

// The card that drops down from the initials button, like the Claude app's
// profile menu. A Modal sits above everything, including the map and sheet.
export default function ProfileMenu({ visible, user, onClose, onSettings, onTerms, onSignOut }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Tapping anywhere outside the card closes it */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { marginTop: insets.top + 64 }]} onPress={() => {}}>
          <View style={styles.header}>
            <Avatar name={user?.name} size={48} />
            <View style={styles.who}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Row icon="settings-outline" label="Settings" onPress={onSettings} />
          <Row icon="document-text-outline" label="Terms and conditions" onPress={onTerms} />

          <View style={styles.divider} />

          <Row icon="log-out-outline" label="Sign out" onPress={onSignOut} tone="danger" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28, 25, 23, 0.25)', alignItems: 'flex-end' },
  card: {
    width: 280,
    marginRight: 16,
    backgroundColor: colours.surface,
    borderRadius: 18,
    paddingVertical: 8,
    ...floating,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  who: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colours.ink },
  email: { fontSize: 13, color: colours.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colours.border, marginVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pressed: { backgroundColor: colours.background },
  rowText: { fontSize: 15 },
});
