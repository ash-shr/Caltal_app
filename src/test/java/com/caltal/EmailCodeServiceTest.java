package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class EmailCodeServiceTest {

    private final EmailCodeRepository codes = mock(EmailCodeRepository.class);
    // The real hashing, at its cheapest setting so the tests stay quick
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final Instant now = Instant.parse("2026-10-22T12:00:00Z");
    private final User ash = new User("ash@example.com", "hash", "Ash");

    private EmailCodeService service(Instant at) {
        return new EmailCodeService(codes, encoder, Clock.fixed(at, ZoneOffset.UTC));
    }

    private EmailCode waiting(String code, Instant createdAt) {
        return new EmailCode(ash, encoder.encode(code), createdAt,
                createdAt.plus(EmailCodeService.LIFETIME));
    }

    @Test
    void issuesASixDigitCodeAndKeepsOnlyItsHash() {
        String code = service(now).issue(ash);

        assertTrue(code.matches("\\d{6}"));
        ArgumentCaptor<EmailCode> saved = ArgumentCaptor.forClass(EmailCode.class);
        verify(codes).save(saved.capture());
        assertTrue(encoder.matches(code, saved.getValue().getCodeHash()));
        assertEquals(now.plus(Duration.ofMinutes(15)), saved.getValue().getExpiresAt());
        // Any earlier code stops working
        verify(codes).markAllUsed(ash, now);
    }

    @Test
    void refusesMoreThanFiveCodesAnHour() {
        when(codes.countByUserAndCreatedAtAfter(any(User.class), any(Instant.class))).thenReturn(5L);

        assertThrows(TooManyEmailsException.class, () -> service(now).issue(ash));
        verify(codes, never()).save(any(EmailCode.class));
    }

    @Test
    void theRightCodeIsUsedUp() {
        EmailCode latest = waiting("482913", now);
        when(codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(ash))
                .thenReturn(Optional.of(latest));

        service(now.plusSeconds(60)).use(ash, " 482 913 ");

        assertNotNull(latest.getUsedAt());
    }

    @Test
    void aWrongCodeIsCountedAndRefused() {
        EmailCode latest = waiting("482913", now);
        when(codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(ash))
                .thenReturn(Optional.of(latest));

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service(now).use(ash, "111111"));

        assertEquals(EmailCodeService.WRONG, refused.getMessage());
        assertEquals(1, latest.getAttempts());
        assertEquals(null, latest.getUsedAt());
    }

    @Test
    void stopsWorkingAfterFiveWrongTriesEvenWithTheRightCode() {
        EmailCode latest = waiting("482913", now);
        when(codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(ash))
                .thenReturn(Optional.of(latest));
        EmailCodeService service = service(now);

        for (int i = 0; i < EmailCodeService.MAX_WRONG_ATTEMPTS; i++) {
            assertThrows(IllegalArgumentException.class, () -> service.use(ash, "111111"));
        }

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service.use(ash, "482913"));
        assertEquals(EmailCodeService.TOO_MANY_TRIES, refused.getMessage());
    }

    @Test
    void anExpiredCodeIsRefused() {
        EmailCode latest = waiting("482913", now);
        when(codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(ash))
                .thenReturn(Optional.of(latest));

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service(now.plus(Duration.ofMinutes(16))).use(ash, "482913"));

        assertEquals(EmailCodeService.EXPIRED, refused.getMessage());
    }

    @Test
    void noCodeWaitingIsTreatedAsExpired() {
        when(codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(ash)).thenReturn(Optional.empty());

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class,
                () -> service(now).use(ash, "482913"));

        assertEquals(EmailCodeService.EXPIRED, refused.getMessage());
    }
}
