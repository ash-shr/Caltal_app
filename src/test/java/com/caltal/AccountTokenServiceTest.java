package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AccountTokenServiceTest {

    private final AccountTokenRepository repository = mock(AccountTokenRepository.class);
    private final Instant now = Instant.parse("2026-10-15T12:00:00Z");
    private final AccountTokenService service =
            new AccountTokenService(repository, Clock.fixed(now, ZoneOffset.UTC));

    private final User ash = new User("ash@example.com", "hash", "Ash");

    private AccountToken savedFor(String secret, TokenPurpose purpose, Instant createdAt) {
        AccountToken token = new AccountToken(ash, purpose, AccountTokenService.hash(secret), createdAt);
        when(repository.findByTokenHashAndPurpose(AccountTokenService.hash(secret), purpose))
                .thenReturn(Optional.of(token));
        return token;
    }

    @Test
    void issuesALongRandomSecretAndKeepsOnlyItsHash() {
        String secret = service.issue(ash, TokenPurpose.RESET_PASSWORD);

        ArgumentCaptor<AccountToken> saved = ArgumentCaptor.forClass(AccountToken.class);
        verify(repository).save(saved.capture());

        // 32 bytes, base64 without padding
        assertEquals(43, secret.length());
        assertNotEquals(secret, saved.getValue().getTokenHash());
        assertEquals(AccountTokenService.hash(secret), saved.getValue().getTokenHash());
        assertSame(ash, saved.getValue().getUser());
    }

    @Test
    void neverIssuesTheSameSecretTwice() {
        assertNotEquals(
                service.issue(ash, TokenPurpose.RESET_PASSWORD),
                service.issue(ash, TokenPurpose.RESET_PASSWORD));
    }

    @Test
    void aResetLinkLastsAnHourAndAConfirmationLinkTwoDays() {
        service.issue(ash, TokenPurpose.RESET_PASSWORD);
        service.issue(ash, TokenPurpose.VERIFY_EMAIL);

        ArgumentCaptor<AccountToken> saved = ArgumentCaptor.forClass(AccountToken.class);
        verify(repository, times(2)).save(saved.capture());

        assertEquals(now.plus(Duration.ofHours(1)), saved.getAllValues().get(0).getExpiresAt());
        assertEquals(now.plus(Duration.ofHours(48)), saved.getAllValues().get(1).getExpiresAt());
    }

    @Test
    void refusesAFourthEmailOfTheSameKindWithinAnHour() {
        when(repository.countByUserAndPurposeAndCreatedAtAfter(
                ash, TokenPurpose.RESET_PASSWORD, now.minus(Duration.ofHours(1))))
                .thenReturn(3L);

        assertThrows(TooManyEmailsException.class,
                () -> service.issue(ash, TokenPurpose.RESET_PASSWORD));
        verify(repository, never()).save(any(AccountToken.class));
    }

    @Test
    void tidiesAwayLinksThatExpiredOverADayAgo() {
        service.issue(ash, TokenPurpose.VERIFY_EMAIL);

        verify(repository).deleteAllExpiredBefore(now.minus(Duration.ofDays(1)));
    }

    @Test
    void findsALinkThatStillWorks() {
        AccountToken token = savedFor("secret", TokenPurpose.RESET_PASSWORD, now.minus(Duration.ofMinutes(10)));

        assertSame(token, service.findUsable("secret", TokenPurpose.RESET_PASSWORD));
    }

    @Test
    void anExpiredLinkIsDead() {
        savedFor("secret", TokenPurpose.RESET_PASSWORD, now.minus(Duration.ofMinutes(61)));

        IllegalArgumentException dead = assertThrows(IllegalArgumentException.class,
                () -> service.findUsable("secret", TokenPurpose.RESET_PASSWORD));
        assertEquals(AccountTokenService.DEAD_LINK, dead.getMessage());
    }

    @Test
    void aConfirmationLinkCannotResetAPassword() {
        savedFor("secret", TokenPurpose.VERIFY_EMAIL, now);

        assertThrows(IllegalArgumentException.class,
                () -> service.findUsable("secret", TokenPurpose.RESET_PASSWORD));
    }

    @Test
    void aMissingSecretIsDeadWithoutLookingAnythingUp() {
        assertThrows(IllegalArgumentException.class,
                () -> service.findUsable("  ", TokenPurpose.RESET_PASSWORD));
        assertThrows(IllegalArgumentException.class,
                () -> service.findUsable(null, TokenPurpose.RESET_PASSWORD));
        verify(repository, never()).findByTokenHashAndPurpose(anyString(), any());
    }

    @Test
    void claimingALinkUsesUpEveryOtherLinkOfTheSameKind() {
        AccountToken token = savedFor("secret", TokenPurpose.RESET_PASSWORD, now);
        when(repository.markUsed(any(), eq(now))).thenReturn(1);

        service.claim(token);

        verify(repository).markAllUsed(ash, TokenPurpose.RESET_PASSWORD, now);
    }

    @Test
    void aLinkSomeoneUsedAMomentAgoCannotBeClaimedAgain() {
        AccountToken token = savedFor("secret", TokenPurpose.RESET_PASSWORD, now);
        when(repository.markUsed(any(), eq(now))).thenReturn(0);

        assertThrows(IllegalArgumentException.class, () -> service.claim(token));
        verify(repository, never()).markAllUsed(any(), any(), any());
    }
}
