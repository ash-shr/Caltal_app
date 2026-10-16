package com.caltal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserService currentUser;
    private final AccountEmailService accountEmails;

    public AuthController(
            AuthService authService,
            CurrentUserService currentUser,
            AccountEmailService accountEmails) {
        this.authService = authService;
        this.currentUser = currentUser;
        this.accountEmails = accountEmails;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(
                request.getEmail(),
                request.getPassword(),
                request.getName());
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request.getEmail(), request.getPassword());
    }

    @PostMapping("/google")
    public AuthResponse loginWithGoogle(@RequestBody GoogleLoginRequest request) {
        return authService.loginWithGoogle(request.getCredential());
    }

    // Requires a valid token (see SecurityConfig), and revokes every token the
    // user holds — not just the one that made this request.
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        authService.logout(currentUser.get());
    }

    // Always "done", whether or not the email has an account. See the note on
    // AccountEmailService.requestPasswordReset.
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@RequestBody ForgotPasswordRequest request) {
        accountEmails.requestPasswordReset(request.email());
    }

    // From the page the reset email links to. Signs the person straight in.
    @PostMapping("/reset-password")
    public AuthResponse resetPassword(@RequestBody ResetPasswordRequest request) {
        return accountEmails.resetPassword(request.token(), request.password());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalidRequest(IllegalArgumentException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(SignInUnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public String handleUnavailable(SignInUnavailableException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public String handleBadCredentials(BadCredentialsException exception) {
        return exception.getMessage();
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(String token, String password) {
    }
}
