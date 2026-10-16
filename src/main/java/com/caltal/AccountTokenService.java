package com.caltal;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Makes and checks the secrets inside emailed links.
//
// A link's secret is 32 random bytes: far too many possibilities to guess, so
// there's no need to count wrong attempts the way a short code would. The
// database keeps only a SHA-256 hash of it. A plain, fast hash is enough here
// (unlike passwords, which need BCrypt) because the secret is already random:
// there's no list of likely values to try.
@Service
public class AccountTokenService {

    // Per person, per kind of email. Stops anyone using "forgot password" to
    // flood someone's inbox, or to burn through the email service's daily
    // allowance.
    static final int MAX_EMAILS_PER_HOUR = 3;

    // The same answer for a link that never existed, one that's expired and one
    // that's been used: which of those it is doesn't help anyone.
    static final String DEAD_LINK = "This link has expired or has already been used.";

    private static final int SECRET_BYTES = 32;

    // Long enough to keep counting recent emails; after that a row is useless
    private static final Duration KEEP_EXPIRED_FOR = Duration.ofDays(1);

    private final AccountTokenRepository tokens;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public AccountTokenService(AccountTokenRepository tokens) {
        this(tokens, Clock.systemUTC());
    }

    // Lets tests choose what time it is
    AccountTokenService(AccountTokenRepository tokens, Clock clock) {
        this.tokens = tokens;
        this.clock = clock;
    }

    // Creates a new link secret for this person and returns it. The secret goes
    // into the email and nowhere else; only its hash is saved.
    @Transactional
    public String issue(User user, TokenPurpose purpose) {
        Instant now = clock.instant();

        tokens.deleteAllExpiredBefore(now.minus(KEEP_EXPIRED_FOR));

        long recent = tokens.countByUserAndPurposeAndCreatedAtAfter(
                user, purpose, now.minus(Duration.ofHours(1)));

        if (recent >= MAX_EMAILS_PER_HOUR) {
            throw new TooManyEmailsException();
        }

        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        // URL-safe, so it can sit in a link without any escaping
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokens.save(new AccountToken(user, purpose, hash(secret), now));
        return secret;
    }

    // The saved record for a secret from a link, if the link still works.
    // Doesn't use it up: callers check anything else they need first, then
    // call claim().
    public AccountToken findUsable(String secret, TokenPurpose purpose) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException(DEAD_LINK);
        }

        return tokens.findByTokenHashAndPurpose(hash(secret.trim()), purpose)
                .filter(token -> token.isUsable(clock.instant()))
                .orElseThrow(() -> new IllegalArgumentException(DEAD_LINK));
    }

    // Uses the link up, along with any other links of the same kind the person
    // was sent. Throws if someone else used it a moment ago. Must run inside the
    // caller's transaction, so that if the caller's own change then fails, the
    // link is given back.
    @Transactional
    public void claim(AccountToken token) {
        Instant now = clock.instant();

        if (tokens.markUsed(token.getId(), now) != 1) {
            throw new IllegalArgumentException(DEAD_LINK);
        }

        tokens.markAllUsed(token.getUser(), token.getPurpose(), now);
    }

    static String hash(String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            // Every Java runtime is required to support SHA-256
            throw new IllegalStateException(impossible);
        }
    }
}
