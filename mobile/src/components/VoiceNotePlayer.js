import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { voiceNoteSource } from '../api';
import { clockTime } from '../voice';
import { colours } from '../theme';

// Plays a voice note: a round play/pause button, a progress bar and the time.
//   fileUri     a recording on this phone that hasn't been saved yet, or
//   taskId      the task whose saved note to play from the server
//   durationMs  the note's length, shown before it has loaded
//   autoPlay    start playing as soon as it has loaded; onAutoPlayed is told
export default function VoiceNotePlayer({
  fileUri,
  taskId,
  durationMs,
  autoPlay = false,
  onAutoPlayed,
}) {
  // Streams from the server, with the sign-in token sent as a header. (The
  // player's "download first" option can't send headers, so it isn't used.)
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  // Which note this is. A failure only counts for the note it happened to.
  const noteKey = fileUri ?? `${taskId}:${durationMs}`;
  const [failedKey, setFailedKey] = useState(null);
  const failed = failedKey === noteKey;

  // A saved note needs the sign-in token to fetch, which is read asynchronously,
  // so the source is handed to the player once it's known.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const source = fileUri ? { uri: fileUri } : await voiceNoteSource(taskId, durationMs);
      if (!cancelled) {
        player.replace(source);
      }
    })().catch(() => !cancelled && setFailedKey(noteKey));

    return () => {
      cancelled = true;
    };
  }, [player, fileUri, taskId, durationMs, noteKey]);

  // Answering a ringing reminder plays the note straight away
  useEffect(() => {
    if (autoPlay && status.isLoaded && !status.playing) {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        .catch(() => {})
        .then(() => {
          player.play();
          onAutoPlayed?.();
        });
    }
  }, [autoPlay, status.isLoaded, status.playing, player, onAutoPlayed]);

  // Back to the start once it has played through, ready to play again
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0).catch(() => {});
    }
  }, [status.didJustFinish, player]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // After recording, iPhones send sound to the earpiece; this puts it back
    // on the speaker, and plays even with the silent switch on.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.play();
  };

  const total = status.duration > 0 ? status.duration * 1000 : durationMs;
  const done = Math.min(status.currentTime * 1000, total);
  const progress = total > 0 ? done / total : 0;
  const loading = !status.isLoaded && !failed;

  if (failed || status.error) {
    return <Text style={styles.error}>{"Couldn't load this voice note. Try again later."}</Text>;
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        disabled={loading}
        style={({ pressed }) => [styles.button, (pressed || loading) && styles.dim]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause the voice note' : 'Play the voice note'}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color="#ffffff" />
      </Pressable>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.time}>
        {status.playing || done > 0 ? `${clockTime(done)} / ${clockTime(total)}` : clockTime(total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.6 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colours.orange },
  time: { fontSize: 13, color: colours.muted, fontVariant: ['tabular-nums'] },
  error: { fontSize: 14, color: colours.muted },
});
