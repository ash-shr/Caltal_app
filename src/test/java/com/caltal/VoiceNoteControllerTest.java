package com.caltal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(VoiceNoteController.class)
class VoiceNoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VoiceNoteService service;

    @MockitoBean
    private CurrentUserService currentUser;

    @MockitoBean
    private JwtService jwtService;

    // JwtAuthFilter looks users up to check their token version
    @MockitoBean
    private UserRepository userRepository;

    private final User owner = new User("ash@example.com", "hash", "Ash");

    private Task taskWithNote(int durationMs) {
        Task task = new Task("buy milk", 53.796, -1.545, 200, LocalDate.of(2026, 10, 21), owner);
        task.attachVoiceNote(durationMs);
        return task;
    }

    @Test
    @WithMockUser
    void uploadsARecordingAndAnswersWithTheTask() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        byte[] audio = VoiceNoteServiceTest.m4a(2_000);
        when(service.save(eq(owner), eq(7L), any(byte[].class), eq(4_200))).thenReturn(taskWithNote(4_200));

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/tasks/7/voice-note")
                        .file(new MockMultipartFile("audio", "note.m4a", "audio/mp4", audio))
                        .param("durationMs", "4200")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voiceNoteMs").value(4_200))
                .andExpect(jsonPath("$.name").value("buy milk"));

        verify(service).save(owner, 7L, audio, 4_200);
    }

    @Test
    @WithMockUser
    void anOversizedUploadIsRefusedBeforeItIsRead() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        byte[] audio = VoiceNoteServiceTest.m4a(VoiceNoteService.MAX_BYTES + 1);

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/tasks/7/voice-note")
                        .file(new MockMultipartFile("audio", "note.m4a", "audio/mp4", audio))
                        .param("durationMs", "4200")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("The recording is too big to save"));

        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void aRefusedRecordingSaysWhy() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        when(service.save(eq(owner), eq(7L), any(byte[].class), anyInt()))
                .thenThrow(new IllegalArgumentException("Voice notes can be up to 2 minutes long"));

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/tasks/7/voice-note")
                        .file(new MockMultipartFile("audio", "note.m4a", "audio/mp4",
                                VoiceNoteServiceTest.m4a(2_000)))
                        .param("durationMs", "999999")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Voice notes can be up to 2 minutes long"));
    }

    @Test
    @WithMockUser
    void servesTheRecordingWithItsOwnTypeAndNeverCached() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        byte[] audio = VoiceNoteServiceTest.m4a(2_000);
        when(service.get(owner, 7L)).thenReturn(
                new VoiceNote(7L, "audio/mp4", 4_200, audio, Instant.parse("2026-10-21T12:00:00Z")));

        mockMvc.perform(get("/api/tasks/7/voice-note"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "audio/mp4"))
                .andExpect(header().string("Content-Length", "2000"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().bytes(audio));
    }

    @Test
    @WithMockUser
    void servesPartOfTheRecordingWhenAskedForARange() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        byte[] audio = VoiceNoteServiceTest.m4a(2_000);
        audio[100] = 7;
        when(service.get(owner, 7L)).thenReturn(
                new VoiceNote(7L, "audio/mp4", 4_200, audio, Instant.parse("2026-10-21T12:00:00Z")));

        mockMvc.perform(get("/api/tasks/7/voice-note").header("Range", "bytes=100-199"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string("Content-Range", "bytes 100-199/2000"))
                .andExpect(header().string("Content-Length", "100"))
                .andExpect(content().bytes(java.util.Arrays.copyOfRange(audio, 100, 200)));
    }

    @Test
    @WithMockUser
    void aTaskWithoutANoteIsNotFound() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        when(service.get(owner, 7L)).thenThrow(new VoiceNoteNotFoundException());

        mockMvc.perform(get("/api/tasks/7/voice-note"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void someoneElsesTaskIsNotFound() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        when(service.get(owner, 7L)).thenThrow(new TaskNotFoundException("No task with id 7"));

        mockMvc.perform(get("/api/tasks/7/voice-note"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void deletesTheNote() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(delete("/api/tasks/7/voice-note").with(csrf()))
                .andExpect(status().isNoContent());

        verify(service).delete(owner, 7L);
    }
}
