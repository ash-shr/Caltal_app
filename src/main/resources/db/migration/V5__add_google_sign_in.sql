-- Accounts created through Google have no password.
ALTER TABLE app_user ALTER COLUMN password_hash DROP NOT NULL;

-- True once someone has proved they control the address. Google sign-in sets
-- it; password sign-ups stay false until email verification exists.
ALTER TABLE app_user ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Google's permanent id for the person ("sub"). Accounts are matched on this,
-- not on email, because a Google account's email address can change.
ALTER TABLE app_user ADD COLUMN google_subject VARCHAR(255);
CREATE UNIQUE INDEX idx_app_user_google_subject ON app_user (google_subject);
