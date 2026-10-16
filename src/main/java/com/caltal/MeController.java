package com.caltal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// "Me" is whoever the token belongs to. There is no /api/users/{id} on purpose:
// with no id in the URL, there is nothing to change to reach another account.
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final AccountService accounts;
    private final AccountEmailService accountEmails;
    private final CurrentUserService currentUser;

    public MeController(
            AccountService accounts,
            AccountEmailService accountEmails,
            CurrentUserService currentUser) {
        this.accounts = accounts;
        this.accountEmails = accountEmails;
        this.currentUser = currentUser;
    }

    @GetMapping
    public MeResponse me() {
        return MeResponse.of(currentUser.get());
    }

    @PutMapping
    public MeResponse rename(@RequestBody UpdateNameRequest request) {
        return MeResponse.of(accounts.rename(currentUser.get(), request.name()));
    }

    @PutMapping("/password")
    public AuthResponse changePassword(@RequestBody ChangePasswordRequest request) {
        return accounts.changePassword(
                currentUser.get(),
                request.currentPassword(),
                request.newPassword());
    }

    // Accounts that only sign in with Google have no password to confirm with,
    // so the body is optional.
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@RequestBody(required = false) DeleteAccountRequest request) {
        accounts.deleteAccount(currentUser.get(), request == null ? null : request.password());
    }

    // Sends (another) confirmation email
    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendConfirmationEmail() {
        accountEmails.sendConfirmation(currentUser.get());
    }

    // The confirmation link, opened while signed in to this account
    @PostMapping("/verify-email/confirm")
    public MeResponse confirmEmail(@RequestBody ConfirmEmailRequest request) {
        return MeResponse.of(accountEmails.confirmEmail(currentUser.get(), request.token()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalidRequest(IllegalArgumentException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(TooManyEmailsException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public String handleTooManyEmails(TooManyEmailsException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(EmailNotSentException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public String handleEmailNotSent(EmailNotSentException exception) {
        return exception.getMessage();
    }

    // Records: Java writes the constructor, getters, equals and toString, and
    // Jackson reads and writes them as JSON with the same field names.
    public record MeResponse(String name, String email, boolean hasPassword, boolean emailVerified) {
        static MeResponse of(User user) {
            return new MeResponse(
                    user.getName(), user.getEmail(), user.hasPassword(), user.isEmailVerified());
        }
    }

    public record UpdateNameRequest(String name) {
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {
    }

    public record DeleteAccountRequest(String password) {
    }

    public record ConfirmEmailRequest(String token) {
    }
}
