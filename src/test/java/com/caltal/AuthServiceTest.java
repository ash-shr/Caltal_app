package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);
    private final GoogleTokenVerifier google = mock(GoogleTokenVerifier.class);

    private AuthService service() {
        return new AuthService(users, encoder, jwt, google);
    }

    private void googleSays(String token, String subject, String email, String name) {
        when(google.verify(token))
                .thenReturn(new GoogleTokenVerifier.GoogleIdentity(subject, email, name));
    }

    @Test
    void signingOutRevokesEveryTokenTheUserHolds() {
        User user = new User("ash@example.com", "hash", "Ash");

        service().logout(user);

        assertEquals(1, user.getTokenVersion());
        verify(users).save(user);
    }

    @Test
    void aMissingPasswordIsAFailedSignInNotACrash() {
        assertThrows(BadCredentialsException.class,
                () -> service().login("ash@example.com", null));
    }

    @Test
    void anUnknownEmailStillCostsAPasswordCheck() {
        when(encoder.encode(anyString())).thenReturn("equaliser-hash");
        when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        AuthService service = service();

        assertThrows(BadCredentialsException.class,
                () -> service.login("nobody@example.com", "whatever123"));

        // Same work as a wrong password, so response time doesn't reveal which
        // emails have accounts
        verify(encoder).matches("whatever123", "equaliser-hash");
    }

    @Test
    void rejectsAPasswordShorterThanEightCharacters() {
        assertThrows(IllegalArgumentException.class,
                () -> service().register("ash@example.com", "short", "Ash"));
    }

    @Test
    void rejectsAPasswordLongerThanBcryptCanUse() {
        assertThrows(IllegalArgumentException.class,
                () -> service().register("ash@example.com", "x".repeat(73), "Ash"));
    }

    @Test
    void rejectsAnEmailThatAlreadyHasAnAccount() {
        when(users.existsByEmail("ash@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> service().register("ash@example.com", "longenough1", "Ash"));
    }

    @Test
    void registersANewAccountAndReturnsAToken() {
        when(encoder.encode("longenough1")).thenReturn("hashed");
        when(jwt.generateToken(any(User.class))).thenReturn("a-token");

        AuthResponse response = service().register("  Ash@Example.com ", "longenough1", "Ash");

        assertEquals("a-token", response.getToken());
        assertEquals("ash@example.com", response.getEmail());
        verify(users).save(any(User.class));
    }

    @Test
    void createsAVerifiedPasswordlessAccountForANewGoogleUser() {
        googleSays("token", "google-1", "ash@gmail.com", "Ash");
        when(users.findByGoogleSubject("google-1")).thenReturn(Optional.empty());
        when(users.findByEmail("ash@gmail.com")).thenReturn(Optional.empty());
        when(jwt.generateToken(any(User.class))).thenReturn("a-token");

        AuthResponse response = service().loginWithGoogle("token");

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertTrue(saved.getValue().isEmailVerified());
        assertFalse(saved.getValue().hasPassword());
        assertEquals("google-1", saved.getValue().getGoogleSubject());
        assertEquals("a-token", response.getToken());
    }

    @Test
    void recognisesAReturningGoogleUserEvenIfTheirEmailChanged() {
        User existing = User.fromGoogle("old@gmail.com", "Ash", "google-1");
        googleSays("token", "google-1", "new@gmail.com", "Ash");
        when(users.findByGoogleSubject("google-1")).thenReturn(Optional.of(existing));
        when(jwt.generateToken(existing)).thenReturn("a-token");

        AuthResponse response = service().loginWithGoogle("token");

        assertEquals("a-token", response.getToken());
        verify(users, never()).findByEmail(anyString());
    }

    @Test
    void takesOverAnUnverifiedPasswordAccountWithTheSameEmail() {
        // Could have been created by anyone typing this address
        User squatted = new User("ash@gmail.com", "attackers-hash", "Ash");
        googleSays("token", "google-1", "ash@gmail.com", "Ash");
        when(users.findByGoogleSubject("google-1")).thenReturn(Optional.empty());
        when(users.findByEmail("ash@gmail.com")).thenReturn(Optional.of(squatted));

        service().loginWithGoogle("token");

        assertFalse(squatted.hasPassword());
        assertTrue(squatted.isEmailVerified());
        assertEquals(1, squatted.getTokenVersion());
        assertEquals("google-1", squatted.getGoogleSubject());
        verify(users).save(squatted);
    }

    @Test
    void aRejectedGoogleTokenSignsNobodyIn() {
        when(google.verify("forged")).thenThrow(new BadCredentialsException());

        assertThrows(BadCredentialsException.class, () -> service().loginWithGoogle("forged"));
        verify(users, never()).save(any(User.class));
    }

    @Test
    void aGoogleOnlyAccountCannotBeOpenedWithAPassword() {
        when(encoder.encode(anyString())).thenReturn("equaliser-hash");
        User googleOnly = User.fromGoogle("ash@gmail.com", "Ash", "google-1");
        when(users.findByEmail("ash@gmail.com")).thenReturn(Optional.of(googleOnly));
        AuthService service = service();

        assertThrows(BadCredentialsException.class,
                () -> service.login("ash@gmail.com", "guessing123"));
        verify(encoder).matches("guessing123", "equaliser-hash");
    }
}
