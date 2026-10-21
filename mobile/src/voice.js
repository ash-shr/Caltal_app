import { AudioQuality, IOSOutputFormat } from 'expo-audio';

// The longest voice note. The server refuses anything longer.
export const MAX_VOICE_NOTE_MS = 120_000;

// Anything shorter is almost certainly a mis-tap, not a note.
export const MIN_VOICE_NOTE_MS = 500;

// Speech, not music: one channel of AAC at 64 kbit/s, in an .m4a file. Two
// minutes come to about 1 MB. Android and iPhone record the same format, and
// browsers can play it, so the website can play notes made on a phone.
export const VOICE_RECORDING = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

// 75000 -> "1:15"
export function clockTime(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
