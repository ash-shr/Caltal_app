package com.caltal;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// The recording attached to a task. Its id is the task's id: a task has at
// most one note, and saving a new one replaces the old.
@Entity
@Table(name = "voice_note")
public class VoiceNote {

    @Id
    @Column(name = "task_id")
    private Long taskId;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "duration_ms", nullable = false)
    private int durationMs;

    // Plain byte[] (no @Lob) maps to Postgres's bytea column. @Lob would store
    // it as a separate large object instead, which the schema doesn't have.
    @Column(nullable = false)
    private byte[] audio;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected VoiceNote() {
    }

    VoiceNote(Long taskId, String contentType, int durationMs, byte[] audio, Instant createdAt) {
        this.taskId = taskId;
        this.contentType = contentType;
        this.durationMs = durationMs;
        this.audio = audio;
        this.createdAt = createdAt;
    }

    public Long getTaskId() {
        return taskId;
    }

    public String getContentType() {
        return contentType;
    }

    public int getDurationMs() {
        return durationMs;
    }

    public byte[] getAudio() {
        return audio;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
