package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private static final String SECRET = "a-test-secret-that-is-comfortably-over-thirty-two-bytes";

    private final User user = new User("ash@example.com", "hash", "Ash");

    @Test
    void aTokenCarriesTheEmailAndTheTokenVersion() {
        JwtService jwt = new JwtService(SECRET, 24);
        user.revokeTokens();

        JwtService.TokenClaims claims = jwt.parse(jwt.generateToken(user));

        assertEquals("ash@example.com", claims.email());
        assertEquals(1, claims.version());
    }

    @Test
    void refusesToStartWithoutASecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService(null, 24));
    }

    @Test
    void refusesToStartWithASecretTooShortToBeSafe() {
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short", 24));
    }

    @Test
    void rejectsATokenSignedWithSomeoneElsesSecret() {
        JwtService ours = new JwtService(SECRET, 24);
        JwtService theirs = new JwtService("an-entirely-different-secret-also-over-32-bytes", 24);

        String forged = theirs.generateToken(user);

        assertThrows(JwtException.class, () -> ours.parse(forged));
    }

    @Test
    void rejectsATokenWhosePayloadWasEdited() {
        JwtService jwt = new JwtService(SECRET, 24);
        String[] parts = jwt.generateToken(user).split("\\.");

        // Keep the genuine signature but swap in a payload claiming another user
        parts[1] = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"someone-else@example.com\",\"ver\":0}".getBytes(StandardCharsets.UTF_8));

        assertThrows(JwtException.class, () -> jwt.parse(String.join(".", parts)));
    }

    @Test
    void rejectsAnExpiredToken() {
        JwtService alreadyExpired = new JwtService(SECRET, -1);

        String token = alreadyExpired.generateToken(user);

        assertThrows(ExpiredJwtException.class, () -> alreadyExpired.parse(token));
    }
}
