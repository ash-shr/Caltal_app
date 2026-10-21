import { useEffect, useState } from 'react';
import { getVoiceNote } from './api';

// Plays a task's voice note. The recording is fetched with the sign-in token
// and handed to the browser's own audio player as a blob: address, which only
// this page can use. `version` changes when the note does (a new recording),
// so the new one is fetched rather than the old one played again.
function VoiceNotePlayer({ taskId, version }) {
  const [loaded, setLoaded] = useState({ key: null, url: null, failed: false });
  const key = `${taskId}:${version}`;

  useEffect(() => {
    let url = null;
    let cancelled = false;

    getVoiceNote(taskId)
      .then(blob => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setLoaded({ key, url, failed: false });
        }
      })
      .catch(() => !cancelled && setLoaded({ key, url: null, failed: true }));

    // The blob stays in memory until its address is let go of
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [taskId, key]);

  if (loaded.key !== key) {
    return <p className="text-sm text-stone-400">Loading the voice note…</p>;
  }
  if (loaded.failed) {
    return <p className="text-sm text-stone-500">{"Couldn't load this voice note. Try again later."}</p>;
  }
  return (
    <audio controls preload="metadata" src={loaded.url} className="w-full">
      Your browser can't play this voice note.
    </audio>
  );
}

export default VoiceNotePlayer;
