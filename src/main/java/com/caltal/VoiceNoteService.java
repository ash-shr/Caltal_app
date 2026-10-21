package com.caltal;

import java.time.Clock;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Voice notes on tasks: one short recording per task, at most two minutes.
//
// Every method starts from the signed-in person's own task, looked up by id AND
// owner, so nobody can read, replace or delete a note on someone else's task.
@Service
public class VoiceNoteService {

    // Two minutes, as the app's recorder stops there. A second of slack, as a
    // recorder can report a few milliseconds over when it stops itself.
    static final int MAX_DURATION_MS = 121_000;

    // Two minutes of speech in the format the app records (AAC, 64 kbit/s) is
    // about 1 MB. Twice that leaves room without letting files grow unbounded.
    static final int MAX_BYTES = 2 * 1024 * 1024;

    // The audio is kept in the database, so cap how much one account can keep.
    static final int MAX_NOTES_PER_ACCOUNT = 100;

    private final TaskRepository tasks;
    private final VoiceNoteRepository notes;
    private final Clock clock;

    @Autowired
    public VoiceNoteService(TaskRepository tasks, VoiceNoteRepository notes) {
        this(tasks, notes, Clock.systemUTC());
    }

    VoiceNoteService(TaskRepository tasks, VoiceNoteRepository notes, Clock clock) {
        this.tasks = tasks;
        this.notes = notes;
        this.clock = clock;
    }

    // Adds a note to the task, or replaces the one it has.
    @Transactional
    public Task save(User owner, Long taskId, byte[] audio, Integer durationMs) {
        Task task = findOwnedTask(owner, taskId);

        if (audio == null || audio.length == 0) {
            throw new IllegalArgumentException("The recording is empty");
        }
        if (audio.length > MAX_BYTES) {
            throw new IllegalArgumentException("The recording is too big to save");
        }
        if (durationMs == null || durationMs <= 0) {
            throw new IllegalArgumentException("The recording's length is missing");
        }
        if (durationMs > MAX_DURATION_MS) {
            throw new IllegalArgumentException("Voice notes can be up to 2 minutes long");
        }

        String contentType = detectContentType(audio);
        if (contentType == null) {
            throw new IllegalArgumentException("That isn't a recording Caltal can play");
        }

        // Replacing a task's note doesn't add to the count; only a new one does
        if (!task.hasVoiceNote() && tasks.countWithVoiceNotes(owner) >= MAX_NOTES_PER_ACCOUNT) {
            throw new IllegalArgumentException("You can keep up to " + MAX_NOTES_PER_ACCOUNT
                    + " voice notes. Delete some you no longer need to add more.");
        }

        notes.save(new VoiceNote(task.getId(), contentType, durationMs, audio, clock.instant()));
        task.attachVoiceNote(durationMs);
        tasks.save(task);
        return task;
    }

    @Transactional(readOnly = true)
    public VoiceNote get(User owner, Long taskId) {
        Task task = findOwnedTask(owner, taskId);

        if (!task.hasVoiceNote()) {
            throw new VoiceNoteNotFoundException();
        }

        return notes.findById(task.getId()).orElseThrow(VoiceNoteNotFoundException::new);
    }

    // Deleting a note the task doesn't have is not an error: the result is the
    // same either way.
    @Transactional
    public Task delete(User owner, Long taskId) {
        Task task = findOwnedTask(owner, taskId);

        notes.deleteById(task.getId());
        task.removeVoiceNote();
        tasks.save(task);
        return task;
    }

    private Task findOwnedTask(User owner, Long taskId) {
        return tasks.findByIdAndOwner(taskId, owner)
                .orElseThrow(() -> new TaskNotFoundException("No task with id " + taskId));
    }

    // What the file actually is, from its first bytes. The type the upload
    // claims is ignored: it's whatever the sender says, and the note is later
    // served back with this type.
    //   MP4 / M4A (what phones record): bytes 4-7 spell "ftyp"
    //   WebM (what most browsers record): starts 1A 45 DF A3
    static String detectContentType(byte[] audio) {
        if (audio.length >= 12
                && audio[4] == 'f' && audio[5] == 't' && audio[6] == 'y' && audio[7] == 'p') {
            return "audio/mp4";
        }
        if (audio.length >= 4
                && (audio[0] & 0xFF) == 0x1A && (audio[1] & 0xFF) == 0x45
                && (audio[2] & 0xFF) == 0xDF && (audio[3] & 0xFF) == 0xA3) {
            return "audio/webm";
        }
        return null;
    }
}
