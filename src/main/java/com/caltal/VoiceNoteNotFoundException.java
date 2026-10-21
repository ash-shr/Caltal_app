package com.caltal;

// The task exists and is yours, but has no voice note.
public class VoiceNoteNotFoundException extends RuntimeException {

    public VoiceNoteNotFoundException() {
        super("This task has no voice note");
    }
}
