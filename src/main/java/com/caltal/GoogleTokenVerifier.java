package com.caltal;

import java.util.Collection;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

// Checks an ID token handed to the browser by Google Sign-In. A token is only
// trusted if all of these hold:
//   - it is signed by one of Google's published keys
//   - it hasn't expired
//   - it was issued by Google
//   - it was issued FOR CALTAL (the audience is our client ID)
//   - Google says the email address is verified
//
// The audience check is the one that is easy to forget and fatal to skip. Any
// website using Google Sign-In receives genuine Google-signed tokens for its
// visitors. Without the audience check, that site's owner could replay one of
// those tokens to Caltal and sign in as their visitor.
@Service
public class GoogleTokenVerifier {

    public record GoogleIdentity(String subject, String email, String name) {
    }

    private static final String GOOGLE_SIGNING_KEYS = "https://www.googleapis.com/oauth2/v3/certs";

    // Google uses both spellings
    private static final Set<String> GOOGLE_ISSUERS =
            Set.of("accounts.google.com", "https://accounts.google.com");

    private final NimbusJwtDecoder decoder;
    private final String clientId;

    @Autowired
    public GoogleTokenVerifier(@Value("${google.client-id:}") String clientId) {
        // Fetches Google's public keys on first use and caches them, so Google
        // can rotate its keys without Caltal needing a change.
        this(NimbusJwtDecoder.withJwkSetUri(GOOGLE_SIGNING_KEYS).build(), clientId);
    }

    // Lets tests supply a decoder that trusts a key they generated themselves
    GoogleTokenVerifier(NimbusJwtDecoder decoder, String clientId) {
        this.decoder = decoder;
        this.clientId = clientId == null ? "" : clientId.trim();

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                // Typed as Object and null-checked: a token missing a claim must be
                // rejected, not crash the check with a NullPointerException.
                new JwtClaimValidator<Object>(JwtClaimNames.ISS,
                        issuer -> issuer != null && GOOGLE_ISSUERS.contains(issuer.toString())),
                new JwtClaimValidator<Object>(JwtClaimNames.AUD,
                        audience -> audience instanceof Collection<?> audiences
                                && audiences.contains(this.clientId))));
    }

    public GoogleIdentity verify(String idToken) {
        if (clientId.isEmpty()) {
            throw new SignInUnavailableException("Google sign-in isn't set up on this server");
        }

        if (idToken == null || idToken.isBlank()) {
            throw new BadCredentialsException();
        }

        Jwt jwt;

        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException exception) {
            throw new BadCredentialsException();
        }

        String email = jwt.getClaimAsString("email");

        if (email == null || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            throw new BadCredentialsException();
        }

        String name = jwt.getClaimAsString("name");

        if (name == null || name.isBlank()) {
            name = email.substring(0, email.indexOf('@'));
        }

        return new GoogleIdentity(jwt.getSubject(), email, name);
    }
}
