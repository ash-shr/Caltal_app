package com.caltal;

import java.io.IOException;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// A task's voice note:
//   PUT    /api/tasks/{id}/voice-note   upload (a form with "audio" and "durationMs")
//   GET    /api/tasks/{id}/voice-note   the recording itself
//   DELETE /api/tasks/{id}/voice-note   remove it
// The task's own JSON says whether it has one: voiceNoteMs, its length.
@RestController
@RequestMapping("/api/tasks/{id}/voice-note")
public class VoiceNoteController {

    private final VoiceNoteService service;
    private final CurrentUserService currentUser;

    public VoiceNoteController(VoiceNoteService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Task upload(
            @PathVariable Long id,
            @RequestParam("audio") MultipartFile audio,
            @RequestParam("durationMs") Integer durationMs) throws IOException {
        // Checked before reading the file into memory
        if (audio.getSize() > VoiceNoteService.MAX_BYTES) {
            throw new IllegalArgumentException("The recording is too big to save");
        }
        return service.save(currentUser.get(), id, audio.getBytes(), durationMs);
    }

    // Sent as a Resource so Spring answers "Range" requests (part of the file)
    // too: iPhones' player asks for audio in parts and won't play without them.
    @GetMapping
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        VoiceNote note = service.get(currentUser.get(), id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(note.getContentType()))
                // Someone's own recording: never kept by a shared cache
                .cacheControl(CacheControl.noStore())
                .body(new ByteArrayResource(note.getAudio()));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
    }

    @ExceptionHandler({ TaskNotFoundException.class, VoiceNoteNotFoundException.class })
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String handleMissing(RuntimeException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalid(IllegalArgumentException exception) {
        return exception.getMessage();
    }
}
