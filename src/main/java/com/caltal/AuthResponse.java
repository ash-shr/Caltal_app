package com.caltal;

// What signing up or signing in answers with. Either a session (a token, with
// the person's name and email), or, for an account whose email hasn't been
// confirmed yet, no token and confirmEmail true: a code is on its way to that
// email, and the next step is to enter it.
public class AuthResponse {

    private final String token;
    private final String name;
    private final String email;
    private final boolean confirmEmail;

    public AuthResponse(String token, String name, String email) {
        this(token, name, email, false);
    }

    private AuthResponse(String token, String name, String email, boolean confirmEmail) {
        this.token = token;
        this.name = name;
        this.email = email;
        this.confirmEmail = confirmEmail;
    }

    static AuthResponse needsConfirmation(String email) {
        return new AuthResponse(null, null, email, true);
    }

    public String getToken() { return token; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public boolean isConfirmEmail() { return confirmEmail; }
}
