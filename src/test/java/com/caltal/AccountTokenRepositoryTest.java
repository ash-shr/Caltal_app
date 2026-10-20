package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

// Runs against a real (in-memory) database, with the real migrations, so it
// also checks that V7 matches the AccountToken class.
@DataJpaTest
class AccountTokenRepositoryTest {

    @Autowired
    private AccountTokenRepository tokens;

    @Autowired
    private UserRepository users;

    // The update queries go straight to the database, past the copies of rows
    // the test already has loaded. clear() forgets those copies, so the next
    // read sees what's really stored.
    @Autowired
    private TestEntityManager entityManager;

    private final Instant now = Instant.parse("2026-10-15T12:00:00Z");

    private AccountToken save(User user, TokenPurpose purpose, String hash, Instant createdAt) {
        return tokens.save(new AccountToken(user, purpose, hash, createdAt));
    }

    private AccountToken reload(AccountToken token) {
        return tokens.findById(token.getId()).orElseThrow();
    }

    @Test
    void findsALinkByItsHashAndKindWithItsUser() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now);
        entityManager.clear();

        AccountToken found = tokens.findByTokenHashAndPurpose("a".repeat(64), TokenPurpose.RESET_PASSWORD)
                .orElseThrow();

        assertEquals("ash@example.com", found.getUser().getEmail());
        assertEquals(now.plus(Duration.ofHours(1)), found.getExpiresAt());
        assertTrue(tokens.findByTokenHashAndPurpose("a".repeat(64), TokenPurpose.VERIFY_EMAIL).isEmpty());
    }

    @Test
    void aLinkCanOnlyBeMarkedUsedOnce() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        AccountToken token = save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now);

        assertEquals(1, tokens.markUsed(token.getId(), now));
        assertEquals(0, tokens.markUsed(token.getId(), now.plusSeconds(1)));

        entityManager.clear();
        assertEquals(now, reload(token).getUsedAt());
    }

    @Test
    void usingUpLinksOnlyTouchesOnePersonsLinksOfOneKind() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        AccountToken ashReset1 = save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now);
        AccountToken ashReset2 = save(ash, TokenPurpose.RESET_PASSWORD, "b".repeat(64), now);
        AccountToken ashConfirm = save(ash, TokenPurpose.VERIFY_EMAIL, "c".repeat(64), now);
        AccountToken samReset = save(sam, TokenPurpose.RESET_PASSWORD, "d".repeat(64), now);

        assertEquals(2, tokens.markAllUsed(ash, TokenPurpose.RESET_PASSWORD, now));

        entityManager.clear();
        assertNotNull(reload(ashReset1).getUsedAt());
        assertNotNull(reload(ashReset2).getUsedAt());
        assertNull(reload(ashConfirm).getUsedAt());
        assertNull(reload(samReset).getUsedAt());
    }

    @Test
    void countsOnlyRecentLinksOfOneKind() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now.minus(Duration.ofMinutes(90)));
        save(ash, TokenPurpose.RESET_PASSWORD, "b".repeat(64), now.minus(Duration.ofMinutes(30)));
        save(ash, TokenPurpose.VERIFY_EMAIL, "c".repeat(64), now.minus(Duration.ofMinutes(5)));

        assertEquals(1, tokens.countByUserAndPurposeAndCreatedAtAfter(
                ash, TokenPurpose.RESET_PASSWORD, now.minus(Duration.ofHours(1))));
    }

    @Test
    void tidiesAwayOnlyLinksThatExpiredBeforeTheCutoff() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        // Expired two days ago
        save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now.minus(Duration.ofDays(2)));
        // Still working
        AccountToken current = save(ash, TokenPurpose.RESET_PASSWORD, "b".repeat(64), now);

        assertEquals(1, tokens.deleteAllExpiredBefore(now.minus(Duration.ofDays(1))));

        entityManager.clear();
        assertEquals(1, tokens.count());
        assertEquals(current.getId(), tokens.findAll().get(0).getId());
    }

    @Test
    void deletesEveryLinkOfOnePersonAndNoOneElses() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        save(ash, TokenPurpose.RESET_PASSWORD, "a".repeat(64), now);
        save(ash, TokenPurpose.VERIFY_EMAIL, "b".repeat(64), now);
        save(sam, TokenPurpose.VERIFY_EMAIL, "c".repeat(64), now);

        tokens.deleteAllByUser(ash);

        assertEquals(1, tokens.count());
    }

    // The whole journey of one link, with the real database underneath
    @Test
    void aLinkWorksOnceAndThenNeverAgain() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        AccountTokenService service = new AccountTokenService(tokens, Clock.fixed(now, ZoneOffset.UTC));

        String secret = service.issue(ash, TokenPurpose.RESET_PASSWORD);
        String other = service.issue(ash, TokenPurpose.RESET_PASSWORD);

        service.claim(service.findUsable(secret, TokenPurpose.RESET_PASSWORD));
        entityManager.clear();

        assertThrows(IllegalArgumentException.class,
                () -> service.findUsable(secret, TokenPurpose.RESET_PASSWORD));
        // The second email's link stopped working too
        assertThrows(IllegalArgumentException.class,
                () -> service.findUsable(other, TokenPurpose.RESET_PASSWORD));
    }
}
