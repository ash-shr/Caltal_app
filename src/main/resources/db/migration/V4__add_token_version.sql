-- Signing out bumps this, which invalidates every token issued before it.
ALTER TABLE app_user ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
