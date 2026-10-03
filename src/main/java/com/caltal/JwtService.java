package com.caltal;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    // Every token carries the user's token version at the moment it was issued.
    // Signing out bumps the version on the user, which makes every older token
    // stop working — the only way to revoke a stateless token before it expires.
    static final String VERSION_CLAIM = "ver";

    // The account's database id. An email can be reused — an account can be
    // deleted and a new one made with the same address — but an id never is,
    // so a token from the old account can't open the new one.
    static final String USER_ID_CLAIM = "uid";

    // HS256 needs a 256-bit key. JJWT would reject a shorter one anyway, but with
    // an error that doesn't say what to do about it.
    private static final int MINIMUM_SECRET_BYTES = 32;

    private final SecretKey key;
    private final long expiryMillis;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiry-hours:24}") long expiryHours) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MINIMUM_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set and at least " + MINIMUM_SECRET_BYTES + " bytes long");
        }

        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMillis = expiryHours * 60 * 60 * 1000;
    }

    public String generateToken(User user) {
        Date now = new Date();

        return Jwts.builder()
                .subject(user.getEmail())
                .claim(VERSION_CLAIM, user.getTokenVersion())
                .claim(USER_ID_CLAIM, user.getId())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMillis))
                .signWith(key)
                .compact();
    }

    // Throws io.jsonwebtoken.JwtException if the token is forged, tampered with
    // or expired.
    public TokenClaims parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Integer version = claims.get(VERSION_CLAIM, Integer.class);

        // JSON has one kind of number, so read the id as whatever number came back
        Object rawId = claims.get(USER_ID_CLAIM);
        Long userId = rawId instanceof Number number ? number.longValue() : null;

        // Tokens issued before versions existed carry no claim. Treating them as
        // an impossible version means they stop working, and everyone signs in
        // once more after this is deployed.
        return new TokenClaims(claims.getSubject(), version == null ? -1 : version, userId);
    }

    public record TokenClaims(String email, int version, Long userId) {

        // A token with no id in it: older tokens, and users not yet saved
        public TokenClaims(String email, int version) {
            this(email, version, null);
        }
    }
}
