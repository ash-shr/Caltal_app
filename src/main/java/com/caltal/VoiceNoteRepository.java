package com.caltal;

import org.springframework.data.jpa.repository.JpaRepository;

// Looked up by task id. Ownership is checked on the task before any note is
// read or written (VoiceNoteService), never here.
public interface VoiceNoteRepository extends JpaRepository<VoiceNote, Long> {
}
