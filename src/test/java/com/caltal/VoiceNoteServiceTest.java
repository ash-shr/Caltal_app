package com.caltal;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class VoiceNoteServiceTest {

    private final User owner = new User("ash@example.com", "hash", "Ash");
    private final Instant now = Instant.parse("2026-10-21T12:00:00Z");

    private TaskRepository tasks;
    private VoiceNoteRepository notes;
    private VoiceNoteService service;
    private Task task;

    // The first bytes of a real .m4a file: a size, then "ftyp", then "M4A "
    static byte[] m4a(int length) {
        byte[] audio = new byte[length];
        byte[] header = { 0, 0, 0, 0x20, 'f', 't', 'y', 'p', 'M', '4', 'A', ' ' };
        System.arraycopy(header, 0, audio, 0, header.length);
        return audio;
    }

    @BeforeEach
    void setUp() {
        tasks = mock(TaskRepository.class);
        notes = mock(VoiceNoteRepository.class);
        service = new VoiceNoteService(tasks, notes, Clock.fixed(now, ZoneOffset.UTC));

        task = new Task("buy milk", 53.796, -1.545, 200, LocalDate.of(2026, 10, 21), owner);
        ReflectionTestUtils.setField(task, "id", 7L);
        when(tasks.findByIdAndOwner(7L, owner)).thenReturn(Optional.of(task));
    }

    @Test
    void savesARecordingAndMarksTheTaskWithItsLength() {
        byte[] audio = m4a(5_000);

        Task saved = service.save(owner, 7L, audio, 4_200);

        ArgumentCaptor<VoiceNote> stored = ArgumentCaptor.forClass(VoiceNote.class);
        verify(notes).save(stored.capture());
        assertEquals(7L, stored.getValue().getTaskId());
        assertEquals("audio/mp4", stored.getValue().getContentType());
        assertEquals(4_200, stored.getValue().getDurationMs());
        assertArrayEquals(audio, stored.getValue().getAudio());
        assertEquals(now, stored.getValue().getCreatedAt());

        assertSame(task, saved);
        assertEquals(4_200, saved.getVoiceNoteMs());
        verify(tasks).save(task);
    }

    @Test
    void aNewNoteIsRefusedOnceTheAccountHasTheMost() {
        when(tasks.countWithVoiceNotes(owner)).thenReturn((long) VoiceNoteService.MAX_NOTES_PER_ACCOUNT);

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service.save(owner, 7L, m4a(5_000), 4_200));

        assertEquals("You can keep up to 100 voice notes. Delete some you no longer need to add more.",
                refused.getMessage());
        verify(notes, never()).save(any());
    }

    @Test
    void replacingATasksNoteIsAllowedEvenAtTheMost() {
        task.attachVoiceNote(1_000);
        when(tasks.countWithVoiceNotes(owner)).thenReturn((long) VoiceNoteService.MAX_NOTES_PER_ACCOUNT);

        Task saved = service.save(owner, 7L, m4a(5_000), 9_000);

        assertEquals(9_000, saved.getVoiceNoteMs());
        verify(notes).save(any());
    }

    @Test
    void refusesRecordingsLongerThanTwoMinutes() {
        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service.save(owner, 7L, m4a(5_000), VoiceNoteService.MAX_DURATION_MS + 1));

        assertEquals("Voice notes can be up to 2 minutes long", refused.getMessage());
        verify(notes, never()).save(any());
    }

    @Test
    void refusesAMissingOrZeroLength() {
        assertThrows(IllegalArgumentException.class, () -> service.save(owner, 7L, m4a(5_000), null));
        assertThrows(IllegalArgumentException.class, () -> service.save(owner, 7L, m4a(5_000), 0));
        verify(notes, never()).save(any());
    }

    @Test
    void refusesEmptyAndOversizedFiles() {
        assertThrows(IllegalArgumentException.class, () -> service.save(owner, 7L, new byte[0], 1_000));
        assertThrows(IllegalArgumentException.class,
                () -> service.save(owner, 7L, m4a(VoiceNoteService.MAX_BYTES + 1), 1_000));
        verify(notes, never()).save(any());
    }

    @Test
    void refusesFilesThatArentRecordings() {
        byte[] page = "<html><script>alert(1)</script></html>".getBytes();

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service.save(owner, 7L, page, 1_000));

        assertEquals("That isn't a recording Caltal can play", refused.getMessage());
        verify(notes, never()).save(any());
    }

    @Test
    void recognisesWhatPhonesAndBrowsersRecord() {
        assertEquals("audio/mp4", VoiceNoteService.detectContentType(m4a(100)));

        byte[] webm = { 0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0, 0, 0, 0 };
        assertEquals("audio/webm", VoiceNoteService.detectContentType(webm));

        assertNull(VoiceNoteService.detectContentType(new byte[] { 'f', 't', 'y', 'p' }));
    }

    @Test
    void someoneElsesTaskLooksLikeNoTaskAtAll() {
        User stranger = new User("sam@example.com", "hash", "Sam");
        when(tasks.findByIdAndOwner(7L, stranger)).thenReturn(Optional.empty());

        assertThrows(TaskNotFoundException.class, () -> service.save(stranger, 7L, m4a(5_000), 1_000));
        assertThrows(TaskNotFoundException.class, () -> service.get(stranger, 7L));
        assertThrows(TaskNotFoundException.class, () -> service.delete(stranger, 7L));
        verifyNoInteractions(notes);
    }

    @Test
    void readingANoteTheTaskDoesntHaveIsNotFound() {
        assertThrows(VoiceNoteNotFoundException.class, () -> service.get(owner, 7L));
        verifyNoInteractions(notes);
    }

    @Test
    void readsBackTheTasksNote() {
        task.attachVoiceNote(4_200);
        VoiceNote note = new VoiceNote(7L, "audio/mp4", 4_200, m4a(100), now);
        when(notes.findById(7L)).thenReturn(Optional.of(note));

        assertSame(note, service.get(owner, 7L));
    }

    @Test
    void deletingRemovesTheRecordingAndClearsTheTask() {
        task.attachVoiceNote(4_200);

        Task updated = service.delete(owner, 7L);

        verify(notes).deleteById(7L);
        assertNull(updated.getVoiceNoteMs());
        verify(tasks).save(task);
    }
}
