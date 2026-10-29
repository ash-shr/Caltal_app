package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
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
    private final AccountEmailService accountEmails = mock(AccountEmailService.class);
    private final EmailCodeService codes = mock(EmailCodeService.class);

    private AuthService service() {
        return new AuthService(users, encoder, jwt, google, accountEmails, codes);
    }

    private User confirmed(String email) {
        User user = new User(email, "hash", "Ash");
        user.markEmailVerified();
        return user;
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
    void rejectsAnEmailThatAlreadyHasAConfirmedAccount() {
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(confirmed("ash@example.com")));

        assertThrows(IllegalArgumentException.class,
                () -> service().register("ash@example.com", "longenough1", "Ash"));
        verify(accountEmails, never()).sendCode(any(User.class));
    }

    @Test
    void signingUpAsksForTheEmailedCodeInsteadOfSigningIn() {
        when(encoder.encode("longenough1")).thenReturn("hashed");

        AuthResponse response = service().register("  Ash@Example.com ", "longenough1", "Ash");

        assertTrue(response.isConfirmEmail());
        assertEquals(null, response.getToken());
        assertEquals("ash@example.com", response.getEmail());
        verify(jwt, never()).generateToken(any(User.class));

        ArgumentCaptor<User> created = ArgumentCaptor.forClass(User.class);
        verify(users).save(created.capture());
        verify(accountEmails).sendCode(created.getValue());
        assertFalse(created.getValue().isEmailVerified());
    }

    @Test
    void signingUpAgainTakesOverAnAccountThatWasNeverConfirmed() {
        User squatter = new User("ash@example.com", "their-hash", "Not Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(squatter));
        when(encoder.encode("longenough1")).thenReturn("my-hash");

        AuthResponse response = service().register("ash@example.com", "longenough1", "Ash");

        assertTrue(response.isConfirmEmail());
        assertEquals("my-hash", squatter.getPasswordHash());
        assertEquals("Ash", squatter.getName());
        verify(accountEmails).sendCode(squatter);
    }

    @Test
    void aFailedSignUpSendsNoEmail() {
        assertThrows(IllegalArgumentException.class,
                () -> service().register("ash@example.com", "short", "Ash"));

        verify(accountEmails, never()).sendCode(any(User.class));
    }

    @Test
    void signingInToAnUnconfirmedAccountSendsACodeInsteadOfASession() {
        User ash = new User("ash@example.com", "hash", "Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("longenough1", "hash")).thenReturn(true);

        AuthResponse response = service().login("ash@example.com", "longenough1");

        assertTrue(response.isConfirmEmail());
        assertEquals(null, response.getToken());
        verify(accountEmails).sendCode(ash);
        verify(jwt, never()).generateToken(any(User.class));
    }

    @Test
    void refreshingGivesASignedInPersonAFreshToken() {
        User ash = confirmed("ash@example.com");
        when(jwt.generateToken(ash)).thenReturn("fresh-token");

        AuthResponse response = service().refresh(ash);

        assertEquals("fresh-token", response.getToken());
        assertEquals("ash@example.com", response.getEmail());
    }

    @Test
    void signingInToAConfirmedAccountGivesASession() {
        User ash = confirmed("ash@example.com");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("longenough1", "hash")).thenReturn(true);
        when(jwt.generateToken(ash)).thenReturn("a-token");

        AuthResponse response = service().login("ash@example.com", "longenough1");

        assertEquals("a-token", response.getToken());
        assertFalse(response.isConfirmEmail());
        verify(accountEmails, never()).sendCode(any(User.class));
    }

    @Test
    void theRightCodeConfirmsTheEmailAndSignsIn() {
        User ash = new User("ash@example.com", "hash", "Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("longenough1", "hash")).thenReturn(true);
        when(jwt.generateToken(ash)).thenReturn("a-token");

        AuthResponse response = service().confirmEmail("ash@example.com", "longenough1", "482913");

        verify(codes).use(ash, "482913");
        assertTrue(ash.isEmailVerified());
        assertEquals("a-token", response.getToken());
    }

    @Test
    void aWrongCodeLeavesTheEmailUnconfirmed() {
        User ash = new User("ash@example.com", "hash", "Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("longenough1", "hash")).thenReturn(true);
        doThrow(new IllegalArgumentException(EmailCodeService.WRONG)).when(codes).use(ash, "000000");

        assertThrows(IllegalArgumentException.class,
                () -> service().confirmEmail("ash@example.com", "longenough1", "000000"));
        assertFalse(ash.isEmailVerified());
        verify(jwt, never()).generateToken(any(User.class));
    }

    @Test
    void theCodeAloneIsntEnoughWithoutThePassword() {
        User ash = new User("ash@example.com", "hash", "Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("not-mine-123", "hash")).thenReturn(false);

        assertThrows(BadCredentialsException.class,
                () -> service().confirmEmail("ash@example.com", "not-mine-123", "482913"));
        verify(codes, never()).use(any(User.class), anyString());
        assertFalse(ash.isEmailVerified());
    }

    @Test
    void aNewCodeIsSentOnlyForTheRightPasswordAndAnUnconfirmedEmail() {
        User ash = new User("ash@example.com", "hash", "Ash");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(encoder.matches("longenough1", "hash")).thenReturn(true);

        service().resendCode("ash@example.com", "longenough1");
        verify(accountEmails).sendCodeNow(ash);

        ash.markEmailVerified();
        assertThrows(IllegalArgumentException.class,
                () -> service().resendCode("ash@example.com", "longenough1"));
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
