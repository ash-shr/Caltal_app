package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Date;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

// Plays the part of Google: generates its own signing key and issues tokens with
// it, then checks the verifier accepts exactly the ones it should.
class GoogleTokenVerifierTest {

    private static final String CALTAL = "caltal-client-id.apps.googleusercontent.com";
    private static final String SOME_OTHER_APP = "other-app.apps.googleusercontent.com";

    private static KeyPair googleKeys;
    private static KeyPair strangerKeys;

    @BeforeAll
    static void generateKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        googleKeys = generator.generateKeyPair();
        strangerKeys = generator.generateKeyPair();
    }

    private GoogleTokenVerifier verifier(String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withPublicKey((RSAPublicKey) googleKeys.getPublic())
                .build();
        return new GoogleTokenVerifier(decoder, clientId);
    }

    private static JWTClaimsSet.Builder genuineClaims() {
        long now = System.currentTimeMillis();
        return new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(CALTAL)
                .subject("google-user-123")
                .claim("email", "ash@gmail.com")
                .claim("email_verified", true)
                .claim("name", "Ash Sharma")
                .issueTime(new Date(now))
                .expirationTime(new Date(now + 60_000));
    }

    private static String sign(JWTClaimsSet claims, KeyPair keys) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner(keys.getPrivate()));
        return jwt.serialize();
    }

    @Test
    void acceptsAGenuineTokenIssuedForCaltal() throws Exception {
        GoogleTokenVerifier.GoogleIdentity identity =
                verifier(CALTAL).verify(sign(genuineClaims().build(), googleKeys));

        assertEquals("google-user-123", identity.subject());
        assertEquals("ash@gmail.com", identity.email());
        assertEquals("Ash Sharma", identity.name());
    }

    @Test
    void rejectsAGenuineGoogleTokenThatWasIssuedForAnotherApp() throws Exception {
        String theirToken = sign(genuineClaims().audience(SOME_OTHER_APP).build(), googleKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(theirToken));
    }

    @Test
    void rejectsATokenNotSignedByGoogle() throws Exception {
        String forged = sign(genuineClaims().build(), strangerKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(forged));
    }

    @Test
    void rejectsATokenFromAnotherIssuer() throws Exception {
        String token = sign(genuineClaims().issuer("https://evil.example.com").build(), googleKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(token));
    }

    @Test
    void rejectsATokenWithNoIssuerAtAll() throws Exception {
        String token = sign(genuineClaims().issuer(null).build(), googleKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(token));
    }

    @Test
    void rejectsAnExpiredToken() throws Exception {
        long twoHoursAgo = System.currentTimeMillis() - 7_200_000;
        String token = sign(genuineClaims()
                .issueTime(new Date(twoHoursAgo))
                .expirationTime(new Date(twoHoursAgo + 60_000))
                .build(), googleKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(token));
    }

    @Test
    void rejectsAnAddressGoogleHasNotVerified() throws Exception {
        String token = sign(genuineClaims().claim("email_verified", false).build(), googleKeys);

        assertThrows(BadCredentialsException.class, () -> verifier(CALTAL).verify(token));
    }

    @Test
    void fallsBackToTheEmailNameWhenGoogleSendsNoName() throws Exception {
        String token = sign(genuineClaims().claim("name", null).build(), googleKeys);

        assertEquals("ash", verifier(CALTAL).verify(token).name());
    }

    @Test
    void saysSoWhenGoogleSignInIsNotConfigured() throws Exception {
        String token = sign(genuineClaims().build(), googleKeys);

        assertThrows(SignInUnavailableException.class, () -> verifier("").verify(token));
    }
}
