package com.caltal;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleVerifier;

    // A real BCrypt hash to check against when the email doesn't exist. Without
    // it, "no such user" answers instantly while "wrong password" takes the
    // ~100ms BCrypt needs — and that timing difference reveals which emails
    // have accounts, even though the error message is the same.
    private final String timingEqualiser;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifier googleVerifier) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleVerifier = googleVerifier;
        this.timingEqualiser = passwordEncoder.encode("caltal-timing-equaliser");
    }

    public AuthResponse register(String email, String password, String name) {
        PasswordPolicy.check(password);

        String normalisedEmail = email == null ? null : email.toLowerCase().trim();

        if (normalisedEmail != null && users.existsByEmail(normalisedEmail)) {
            throw new IllegalArgumentException("An account with that email already exists");
        }

        User user = new User(email, passwordEncoder.encode(password), name);
        users.save(user);

        return respondWithToken(user);
    }

    public AuthResponse login(String email, String password) {
        if (password == null) {
            throw new BadCredentialsException();
        }

        String normalisedEmail = email == null ? "" : email.toLowerCase().trim();

        User user = users.findByEmail(normalisedEmail).orElse(null);

        // Unknown email, or an account that only signs in with Google: both do the
        // same work and give the same answer as a wrong password.
        if (user == null || !user.hasPassword()) {
            passwordEncoder.matches(password, timingEqualiser);
            throw new BadCredentialsException();
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException();
        }

        return respondWithToken(user);
    }

    public AuthResponse loginWithGoogle(String idToken) {
        GoogleTokenVerifier.GoogleIdentity google = googleVerifier.verify(idToken);

        // 1. Someone who has signed in with this Google account before
        User known = users.findByGoogleSubject(google.subject()).orElse(null);

        if (known != null) {
            return respondWithToken(known);
        }

        // 2. An existing account with the same email. attachGoogle() decides what
        //    happens to its password — see the note on it in User.
        User sameEmail = users.findByEmail(google.email().toLowerCase().trim()).orElse(null);

        if (sameEmail != null) {
            sameEmail.attachGoogle(google.subject());
            users.save(sameEmail);
            return respondWithToken(sameEmail);
        }

        // 3. Someone new
        User created = User.fromGoogle(google.email(), google.name(), google.subject());
        users.save(created);
        return respondWithToken(created);
    }

    // Signs the user out everywhere: every token they hold, on every device,
    // stops working immediately.
    public void logout(User user) {
        user.revokeTokens();
        users.save(user);
    }

    private AuthResponse respondWithToken(User user) {
        return new AuthResponse(
                jwtService.generateToken(user),
                user.getName(),
                user.getEmail());
    }
}
