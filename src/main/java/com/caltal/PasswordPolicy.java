package com.caltal;

import java.nio.charset.StandardCharsets;

// The rules for choosing a password, in one place, so signing up and changing a
// password later can never drift apart.
final class PasswordPolicy {

    static final int MIN_LENGTH = 8;

    // BCrypt only reads the first 72 bytes of a password. Anything past that is
    // silently ignored, so a longer "password" is weaker than it looks.
    static final int MAX_BYTES = 72;

    private PasswordPolicy() {
    }

    static void check(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException(
                    "Password must be at least " + MIN_LENGTH + " characters");
        }

        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new IllegalArgumentException("Password is too long");
        }
    }
}
