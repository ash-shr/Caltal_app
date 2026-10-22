package com.caltal;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Makes and checks the six-digit codes that confirm a new account's email.
//
// A code is short enough to type, so unlike a link's 32-byte secret it could
// be guessed. Three things stop that: each code works for 15 minutes, only the
// newest one works, and after 5 wrong tries it stops working altogether. With
// at most 5 codes an hour, that's 25 guesses an hour at a one-in-a-million
// chance each.
@Service
public class EmailCodeService {

    static final Duration LIFETIME = Duration.ofMinutes(15);
    static final int MAX_WRONG_ATTEMPTS = 5;
    static final int MAX_CODES_PER_HOUR = 5;

    static final String WRONG = "That code isn't right. Check the email and try again.";
    static final String EXPIRED = "That code has expired. Ask for a new one.";
    static final String TOO_MANY_TRIES = "Too many wrong tries. Ask for a new code.";

    private static final Duration KEEP_EXPIRED_FOR = Duration.ofDays(1);

    private final EmailCodeRepository codes;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public EmailCodeService(EmailCodeRepository codes, PasswordEncoder passwordEncoder) {
        this(codes, passwordEncoder, Clock.systemUTC());
    }

    // Lets tests choose what time it is
    EmailCodeService(EmailCodeRepository codes, PasswordEncoder passwordEncoder, Clock clock) {
        this.codes = codes;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    // A new code for this person, replacing any earlier one. Returns the code,
    // which goes into the email and nowhere else.
    @Transactional
    public String issue(User user) {
        Instant now = clock.instant();

        codes.deleteAllExpiredBefore(now.minus(KEEP_EXPIRED_FOR));

        if (codes.countByUserAndCreatedAtAfter(user, now.minus(Duration.ofHours(1)))
                >= MAX_CODES_PER_HOUR) {
            throw new TooManyEmailsException();
        }

        codes.markAllUsed(user, now);

        String code = "%06d".formatted(random.nextInt(1_000_000));
        codes.save(new EmailCode(user, passwordEncoder.encode(code), now, now.plus(LIFETIME)));
        return code;
    }

    // Uses the code up if it's right; otherwise counts the wrong try and
    // says what's wrong. noRollbackFor: the wrong try must still be counted
    // when the error goes back to the person.
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void use(User user, String code) {
        Instant now = clock.instant();

        EmailCode latest = codes.findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new IllegalArgumentException(EXPIRED));

        if (latest.isExpired(now)) {
            throw new IllegalArgumentException(EXPIRED);
        }
        if (latest.getAttempts() >= MAX_WRONG_ATTEMPTS) {
            throw new IllegalArgumentException(TOO_MANY_TRIES);
        }

        String cleaned = code == null ? "" : code.replaceAll("\\s", "");
        if (!cleaned.matches("\\d{6}") || !passwordEncoder.matches(cleaned, latest.getCodeHash())) {
            latest.countWrongAttempt();
            codes.save(latest);
            throw new IllegalArgumentException(
                    latest.getAttempts() >= MAX_WRONG_ATTEMPTS ? TOO_MANY_TRIES : WRONG);
        }

        latest.markUsed(now);
        codes.save(latest);
    }
}
