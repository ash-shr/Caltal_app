package com.caltal;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

// Against a real (in-memory) database with the real migrations, so it also
// checks that V8 matches VoiceNote and Task, and that a note goes when its task does.
@DataJpaTest
class VoiceNoteRepositoryTest {

    @Autowired
    private VoiceNoteRepository notes;

    @Autowired
    private SpringDataTaskRepository tasks;

    @Autowired
    private UserRepository users;

    // The deletes below happen in the database itself (the cascade), out of
    // sight of the copies of rows the test has loaded. flush() sends what's
    // pending; clear() forgets the copies, so reads see what's really stored.
    @Autowired
    private TestEntityManager entityManager;

    private final Instant now = Instant.parse("2026-10-21T12:00:00Z");
    private final LocalDate day = LocalDate.of(2026, 10, 21);

    private Task taskWithNote(User owner, String name, byte[] audio) {
        Task task = tasks.save(new Task(name, 53.796, -1.545, 200, day, owner));
        notes.save(new VoiceNote(task.getId(), "audio/mp4", 4_200, audio, now));
        task.attachVoiceNote(4_200);
        tasks.save(task);
        entityManager.flush();
        entityManager.clear();
        return task;
    }

    @Test
    void keepsTheRecordingByteForByte() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        byte[] audio = VoiceNoteServiceTest.m4a(300_000);
        audio[299_999] = 42;

        Task task = taskWithNote(ash, "buy milk", audio);

        VoiceNote stored = notes.findById(task.getId()).orElseThrow();
        assertArrayEquals(audio, stored.getAudio());
        assertEquals("audio/mp4", stored.getContentType());
        assertEquals(4_200, stored.getDurationMs());
        assertEquals(4_200, tasks.findById(task.getId()).orElseThrow().getVoiceNoteMs());
    }

    @Test
    void deletingATaskDeletesItsNote() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        Task task = taskWithNote(ash, "buy milk", VoiceNoteServiceTest.m4a(1_000));

        tasks.delete(tasks.findById(task.getId()).orElseThrow());
        entityManager.flush();
        entityManager.clear();

        assertFalse(notes.existsById(task.getId()));
    }

    @Test
    void deletingAnAccountsTasksDeletesOnlyTheirNotes() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        Task ashTask = taskWithNote(ash, "buy milk", VoiceNoteServiceTest.m4a(1_000));
        Task samTask = taskWithNote(sam, "post office", VoiceNoteServiceTest.m4a(1_000));

        // What deleting an account does first (AccountService)
        tasks.deleteAllByOwner(ash);
        entityManager.flush();
        entityManager.clear();

        assertFalse(notes.existsById(ashTask.getId()));
        assertTrue(notes.existsById(samTask.getId()));
    }

    @Test
    void countsOnlyTasksWithNotesForThatPerson() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        taskWithNote(ash, "buy milk", VoiceNoteServiceTest.m4a(1_000));
        taskWithNote(ash, "gym", VoiceNoteServiceTest.m4a(1_000));
        tasks.save(new Task("post", 53.796, -1.545, 200, day, ash));
        taskWithNote(sam, "post office", VoiceNoteServiceTest.m4a(1_000));

        assertEquals(2, tasks.countByOwnerAndVoiceNoteMsIsNotNull(ash));
        assertEquals(1, tasks.countByOwnerAndVoiceNoteMsIsNotNull(sam));
    }
}
