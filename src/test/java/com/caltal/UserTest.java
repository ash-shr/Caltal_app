package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class UserTest {

    @Test
    void storesEmailsTrimmedAndLowerCase() {
        User user = new User("  Ash@Example.COM ", "hash", "Ash");

        assertEquals("ash@example.com", user.getEmail());
    }

    @ParameterizedTest
    @ValueSource(strings = { "no-at-sign", "@example.com", "ash@", "ash@nodot", "has space@example.com" })
    void rejectsThingsThatAreNotEmails(String notAnEmail) {
        assertThrows(IllegalArgumentException.class, () -> new User(notAnEmail, "hash", "Ash"));
    }

    @Test
    void rejectsAnEmailLongerThanTheStandardAllows() {
        String tooLong = "a".repeat(250) + "@example.com";

        assertThrows(IllegalArgumentException.class, () -> new User(tooLong, "hash", "Ash"));
    }

    @Test
    void rejectsAnOverlongName() {
        assertThrows(IllegalArgumentException.class,
                () -> new User("ash@example.com", "hash", "x".repeat(101)));
    }

    @Test
    void revokingTokensMovesTheVersionOn() {
        User user = new User("ash@example.com", "hash", "Ash");

        user.revokeTokens();
        user.revokeTokens();

        assertEquals(2, user.getTokenVersion());
    }

    @Test
    void aGoogleAccountStartsVerifiedWithNoPassword() {
        User user = User.fromGoogle("Ash@Gmail.com", "Ash", "google-1");

        assertTrue(user.isEmailVerified());
        assertFalse(user.hasPassword());
        assertEquals("ash@gmail.com", user.getEmail());
    }

    @Test
    void aVeryLongGoogleNameIsShortenedRatherThanRejected() {
        User user = User.fromGoogle("ash@gmail.com", "x".repeat(150), "google-1");

        assertEquals(100, user.getName().length());
    }

    @Test
    void attachingGoogleToAnUnverifiedAccountRemovesThePasswordAndSignsEveryoneOut() {
        User user = new User("ash@gmail.com", "some-hash", "Ash");

        user.attachGoogle("google-1");

        assertFalse(user.hasPassword());
        assertTrue(user.isEmailVerified());
        assertEquals(1, user.getTokenVersion());
    }

    @Test
    void attachingGoogleToAnAlreadyVerifiedAccountLeavesSessionsAlone() {
        User user = User.fromGoogle("ash@gmail.com", "Ash", "google-old");

        user.attachGoogle("google-new");

        assertEquals("google-new", user.getGoogleSubject());
        assertEquals(0, user.getTokenVersion());
    }
}
