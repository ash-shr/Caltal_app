import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import AddRow from './AddRow';
import VoiceNotePlayer from './VoiceNotePlayer';
import { clockTime, MAX_VOICE_NOTE_MS, MIN_VOICE_NOTE_MS, VOICE_RECORDING } from '../voice';
import { colours } from '../theme';

// The voice note part of the task form: record one, listen back, record again
// or remove it. Nothing is uploaded here; the form saves it with the task.
//   value     null for no note, or { durationMs, fileUri } where fileUri is a
//             new recording on this phone, or null for the note already saved
//   taskId    the task being edited, to play its saved note
//   onChange  called with the new value
//   onRecordingChange  told when recording starts and stops, so the form can
//             wait for it before saving
export default function VoiceNoteField({ value, taskId, onChange, onRecordingChange }) {
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const [problem, setProblem] = useState('');
  const [needsSettings, setNeedsSettings] = useState(false);

  // Read inside callbacks and on unmount, where state would be out of date
  const recordingRef = useRef(false);
  // Stops the recording at the two-minute limit
  const limitTimer = useRef(null);

  const setRecordingBoth = isRecording => {
    recordingRef.current = isRecording;
    setRecording(isRecording);
    onRecordingChange?.(isRecording);
  };

  const start = async () => {
    setProblem('');
    setNeedsSettings(false);

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setNeedsSettings(!permission.canAskAgain);
      setProblem('Caltal needs the microphone to record a voice note.');
      return;
    }

    try {
      // iPhones only record once the app says it wants to
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingBoth(true);
      // Two minutes is the limit: stop there, keeping what was said
      limitTimer.current = setTimeout(() => finish(true), MAX_VOICE_NOTE_MS);
    } catch {
      setProblem("Couldn't start recording. Try again.");
    }
  };

  // keep: false throws the recording away (Cancel)
  const finish = async keep => {
    clearTimeout(limitTimer.current);
    if (!recordingRef.current) {
      return;
    }
    const durationMs = Math.round(
      Math.max(recorder.currentTime * 1000, recorderState.durationMillis),
    );
    setRecordingBoth(false);

    try {
      await recorder.stop();
    } catch {
      // Already stopped
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});

    if (!keep) {
      return;
    }
    if (!recorder.uri || durationMs < MIN_VOICE_NOTE_MS) {
      setProblem('That was too short to keep. Try again and speak for a little longer.');
      return;
    }
    onChange({ fileUri: recorder.uri, durationMs: Math.min(durationMs, MAX_VOICE_NOTE_MS) });
  };

  // Leaving the form mid-recording: the recorder goes with the form, but the
  // phone's audio mode has to be put back for playback elsewhere.
  useEffect(
    () => () => {
      clearTimeout(limitTimer.current);
      if (recordingRef.current) {
        onRecordingChange?.(false);
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  let body;

  if (recording) {
    body = (
      <View style={styles.recordingRow}>
        <View style={styles.redDot} />
        <Text style={styles.recordingText}>
          Recording {clockTime(recorderState.durationMillis)}
          <Text style={styles.limit}> / {clockTime(MAX_VOICE_NOTE_MS)}</Text>
        </Text>
        <Pressable onPress={() => finish(false)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => finish(true)}
          style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
        >
          <View style={styles.stopSquare} />
        </Pressable>
      </View>
    );
  } else if (value) {
    body = (
      <View style={styles.noteBox}>
        <View style={styles.noteRow}>
          <VoiceNotePlayer
            fileUri={value.fileUri}
            taskId={taskId}
            durationMs={value.durationMs}
          />
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityLabel="Remove the voice note"
          >
            <Ionicons name="close-circle" size={24} color={colours.faint} />
          </Pressable>
        </View>
        <Pressable onPress={start} style={styles.again} hitSlop={6}>
          <Ionicons name="mic-outline" size={16} color={colours.orange} />
          <Text style={styles.againText}>Record again</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <AddRow icon="mic-outline" label="Add a voice note" hint="up to 2 minutes" onPress={start} />
    );
  }

  return (
    <View style={styles.field}>
      {body}

      {problem !== '' && (
        <Text style={styles.problem}>
          {problem}
          {needsSettings && (
            <Text style={styles.link} onPress={() => Linking.openSettings()}>
              {" Allow it in the phone's settings."}
            </Text>
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colours.danger,
    backgroundColor: colours.dangerSoft,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 52,
  },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colours.danger },
  recordingText: { flex: 1, fontSize: 15, color: colours.ink, fontVariant: ['tabular-nums'] },
  limit: { color: colours.faint },
  cancel: { fontSize: 14, color: colours.muted },
  stop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: { width: 12, height: 12, borderRadius: 2, backgroundColor: '#ffffff' },
  pressed: { opacity: 0.7 },
  noteBox: {
    gap: 10,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    borderRadius: 12,
    padding: 12,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  again: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  againText: { fontSize: 14, color: colours.orange, fontWeight: '500' },
  problem: { fontSize: 13, color: colours.danger, lineHeight: 18 },
  link: { color: colours.orange, textDecorationLine: 'underline' },
});
