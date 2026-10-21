-- A short recording attached to a task, at most one per task.
--
-- The audio sits in its own table so that listing tasks never drags
-- recordings along with it. Deleting a task deletes its note with it (the
-- cascade), which also covers deleting an account, since that deletes the
-- account's tasks.
CREATE TABLE voice_note (
    task_id      BIGINT PRIMARY KEY REFERENCES task(id) ON DELETE CASCADE,
    -- Worked out from the file itself, never taken from the upload's label
    content_type VARCHAR(50) NOT NULL,
    duration_ms  INTEGER NOT NULL,
    audio        BYTEA NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);

-- How long the task's note is, or NULL for no note. Kept on the task so the
-- task list can show a play button without touching the recordings.
ALTER TABLE task ADD COLUMN voice_note_ms INTEGER;
