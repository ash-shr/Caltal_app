package com.caltal;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryMillis;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiry-hours:24}") long expiryHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expiryMillis = expiryHours * 60 * 60 * 1000;
    }

    public String generateToken(String email) {
        Date now = new Date();

        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMillis))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
}