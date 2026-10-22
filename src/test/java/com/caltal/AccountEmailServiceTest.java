package com.caltal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executor;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class AccountEmailServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final AccountTokenService tokens = mock(AccountTokenService.class);
    private final EmailCodeService codes = mock(EmailCodeService.class);
    private final EmailSender sender = mock(EmailSender.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);

    // Runs "background" work straight away, so tests can see what it did
    private AccountEmailService service() {
        return service(Runnable::run);
    }

    private AccountEmailService service(Executor background) {
        return new AccountEmailService(
                users, tokens, codes, sender, encoder, jwt, "https://caltal.fly.dev/", background);
    }

    // Saved users have ids; ones made in a test don't, so give them one
    private User user(long id, String email) {
        User user = new User(email, "old-hash", "Ash");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private AccountToken linkFor(User owner, TokenPurpose purpose) {
        return new AccountToken(owner, purpose, "hash", Instant.now());
    }

    private EmailSender.Email sentEmail() {
        ArgumentCaptor<EmailSender.Email> email = ArgumentCaptor.forClass(EmailSender.Email.class);
        verify(sender).send(email.capture());
        return email.getValue();
    }

    // ---- Forgot password ----------------------------------------------------

    @Test
    void forgotPasswordEmailsAResetLinkToTheWebsite() {
        User ash = user(1, "ash@example.com");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));
        when(tokens.issue(ash, TokenPurpose.RESET_PASSWORD)).thenReturn("s3cret");

        service().requestPasswordReset("  Ash@Example.com ");

        EmailSender.Email email = sentEmail();
        assertEquals("ash@example.com", email.to());
        assertTrue(email.text().contains("https://caltal.fly.dev/reset-password#token=s3cret"));
    }

    @Test
    void forgotPasswordForAnUnknownEmailSendsNothingAndSaysNothing() {
        when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service().requestPasswordReset("nobody@example.com"));
        verify(sender, never()).send(any());
    }

    @Test
    void forgotPasswordNeverReportsWhatHappenedNext() {
        User ash = user(1, "ash@example.com");
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(ash));

        when(tokens.issue(ash, TokenPurpose.RESET_PASSWORD)).thenThrow(new TooManyEmailsException());
        assertDoesNotThrow(() -> service().requestPasswordReset("ash@example.com"));

        // doReturn rather than when(...): calling issue() to stub it would
        // throw the TooManyEmailsException set up above
        doReturn("s3cret").when(tokens).issue(ash, TokenPurpose.RESET_PASSWORD);
        doThrow(new EmailNotSentException("down")).when(sender).send(any());
        assertDoesNotThrow(() -> service().requestPasswordReset("ash@example.com"));
    }

    @Test
    void forgotPasswordAnswersBeforeLookingAnythingUp() {
        List<Runnable> later = new ArrayList<>();

        service(later::add).requestPasswordReset("ash@example.com");

        // The answer has gone back and the account hasn't even been looked for
        verify(users, never()).findByEmail(anyString());
        assertEquals(1, later.size());
    }

    @Test
    void forgotPasswordNeedsAnEmail() {
        assertThrows(IllegalArgumentException.class, () -> service().requestPasswordReset(" "));
    }

    @Test
    void resettingSetsTheNewPasswordAndSignsYouIn() {
        User ash = user(1, "ash@example.com");
        AccountToken link = linkFor(ash, TokenPurpose.RESET_PASSWORD);
        when(tokens.findUsable("s3cret", TokenPurpose.RESET_PASSWORD)).thenReturn(link);
        when(encoder.encode("brand-new-pass")).thenReturn("new-hash");
        when(jwt.generateToken(ash)).thenReturn("fresh-token");

        AuthResponse response = service().resetPassword("s3cret", "brand-new-pass");

        verify(tokens).claim(link);
        verify(users).save(ash);
        assertEquals("new-hash", ash.getPasswordHash());
        assertTrue(ash.isEmailVerified());
        // Every session from before the reset has ended
        assertEquals(1, ash.getTokenVersion());
        assertEquals("fresh-token", response.getToken());
    }

    @Test
    void aTooShortPasswordDoesNotUseUpTheLink() {
        assertThrows(IllegalArgumentException.class,
                () -> service().resetPassword("s3cret", "short"));

        verify(tokens, never()).findUsable(anyString(), any());
        verify(tokens, never()).claim(any());
    }

    @Test
    void aDeadResetLinkChangesNothing() {
        when(tokens.findUsable("old", TokenPurpose.RESET_PASSWORD))
                .thenThrow(new IllegalArgumentException(AccountTokenService.DEAD_LINK));

        assertThrows(IllegalArgumentException.class,
                () -> service().resetPassword("old", "brand-new-pass"));
        verify(users, never()).save(any(User.class));
    }

    // ---- Confirming the email address ---------------------------------------

    @Test
    void emailsTheCodeWithItInTheSubjectToo() {
        User ash = user(1, "ash@example.com");
        when(codes.issue(ash)).thenReturn("482913");

        service().sendCode(ash);

        EmailSender.Email email = sentEmail();
        assertEquals("ash@example.com", email.to());
        assertEquals("482913 is your Caltal code", email.subject());
        assertTrue(email.text().contains("482913"));
        assertTrue(email.html().contains("482913"));
    }

    @Test
    void aBrokenEmailServiceNeverStopsASignUp() {
        User ash = user(1, "ash@example.com");
        when(codes.issue(ash)).thenReturn("482913");
        doThrow(new EmailNotSentException("down")).when(sender).send(any());

        assertDoesNotThrow(() -> service().sendCode(ash));
    }

    @Test
    void tooManyCodesInTheBackgroundIsOnlyLogged() {
        User ash = user(1, "ash@example.com");
        when(codes.issue(ash)).thenThrow(new TooManyEmailsException());

        assertDoesNotThrow(() -> service().sendCode(ash));
        verify(sender, never()).send(any());
    }

    @Test
    void askingForANewCodeReportsAProblemToThePersonWaiting() {
        User ash = user(1, "ash@example.com");
        when(codes.issue(ash)).thenReturn("482913");
        doThrow(new EmailNotSentException("down")).when(sender).send(any());

        assertThrows(EmailNotSentException.class, () -> service().sendCodeNow(ash));
    }

    @Test
    void sendingAgainReportsAProblemToThePersonWaiting() {
        User ash = user(1, "ash@example.com");
        when(tokens.issue(ash, TokenPurpose.VERIFY_EMAIL)).thenReturn("s3cret");
        doThrow(new EmailNotSentException("down")).when(sender).send(any());

        assertThrows(EmailNotSentException.class, () -> service().sendConfirmation(ash));
    }

    @Test
    void anAlreadyConfirmedEmailIsNotSentAnother() {
        User google = User.fromGoogle("ash@gmail.com", "Ash", "google-1");

        assertThrows(IllegalArgumentException.class, () -> service().sendConfirmation(google));
        verify(tokens, never()).issue(any(), any());
    }

    @Test
    void confirmsTheEmailOfTheAccountTheLinkWasSentTo() {
        User signedIn = user(1, "ash@example.com");
        // The same account, loaded again with the link
        User owner = user(1, "ash@example.com");
        AccountToken link = linkFor(owner, TokenPurpose.VERIFY_EMAIL);
        when(tokens.findUsable("s3cret", TokenPurpose.VERIFY_EMAIL)).thenReturn(link);
        when(users.save(owner)).thenReturn(owner);

        User confirmed = service().confirmEmail(signedIn, "s3cret");

        verify(tokens).claim(link);
        assertTrue(confirmed.isEmailVerified());
    }

    @Test
    void aLinkForSomeoneElsesAccountConfirmsNothing() {
        User signedIn = user(1, "ash@example.com");
        User someoneElse = user(2, "sam@example.com");
        when(tokens.findUsable("s3cret", TokenPurpose.VERIFY_EMAIL))
                .thenReturn(linkFor(someoneElse, TokenPurpose.VERIFY_EMAIL));

        assertThrows(IllegalArgumentException.class,
                () -> service().confirmEmail(signedIn, "s3cret"));
        verify(tokens, never()).claim(any());
        verify(users, never()).save(any(User.class));
    }

    @Test
    void openingTheLinkAgainAfterConfirmingIsFine() {
        User google = User.fromGoogle("ash@gmail.com", "Ash", "google-1");

        assertSame(google, service().confirmEmail(google, "already-used"));
        verify(tokens, never()).findUsable(anyString(), any());
    }
}
