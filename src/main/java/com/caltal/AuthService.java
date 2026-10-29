package com.caltal;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleVerifier;
    private final AccountEmailService accountEmails;
    private final EmailCodeService codes;

    // A real BCrypt hash to check against when the email doesn't exist. Without
    // it, "no such user" answers instantly while "wrong password" takes the
    // ~100ms BCrypt needs — and that timing difference reveals which emails
    // have accounts, even though the error message is the same.
    private final String timingEqualiser;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifier googleVerifier,
            AccountEmailService accountEmails,
            EmailCodeService codes) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleVerifier = googleVerifier;
        this.accountEmails = accountEmails;
        this.codes = codes;
        this.timingEqualiser = passwordEncoder.encode("caltal-timing-equaliser");
    }

    // A new account can't be used until its email is confirmed: the answer is
    // "enter the code we've emailed", never a session. That stops accounts
    // being made with addresses that don't exist, or aren't the person's own.
    public AuthResponse register(String email, String password, String name) {
        PasswordPolicy.check(password);

        String normalisedEmail = email == null ? null : email.toLowerCase().trim();
        User existing = normalisedEmail == null
                ? null
                : users.findByEmail(normalisedEmail).orElse(null);

        User user;
        if (existing == null) {
            user = new User(email, passwordEncoder.encode(password), name);
        } else if (!existing.isEmailVerified() && existing.hasPassword()) {
            // Never confirmed, so not proven to be anyone's: see User.restartSignUp
            existing.restartSignUp(passwordEncoder.encode(password), name);
            user = existing;
        } else {
            throw new IllegalArgumentException("An account with that email already exists");
        }
        users.save(user);

        accountEmails.sendCode(user);
        return AuthResponse.needsConfirmation(user.getEmail());
    }

    // The code from the email, with the same email and password as the
    // sign-up. Asking for the password too means only whoever set it can
    // finish: someone who signed up with another person's address can't, even
    // if that person later forwards them the code.
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public AuthResponse confirmEmail(String email, String password, String code) {
        User user = checkPassword(email, password);

        if (!user.isEmailVerified()) {
            codes.use(user, code);
            user.markEmailVerified();
            users.save(user);
        }
        return respondWithToken(user);
    }

    // "Send a new code"
    public void resendCode(String email, String password) {
        User user = checkPassword(email, password);

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Your email is already confirmed. Sign in instead.");
        }
        accountEmails.sendCodeNow(user);
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

        // The right password, but the email was never confirmed (an account
        // made before codes were required, or a sign-up left unfinished). Send
        // a fresh code and ask for it, rather than signing in.
        if (!user.isEmailVerified()) {
            accountEmails.sendCode(user);
            return AuthResponse.needsConfirmation(user.getEmail());
        }

        return respondWithToken(user);
    }

    // The account for this email and password, or the same "wrong email or
    // password" answer as signing in, taking the same time either way
    private User checkPassword(String email, String password) {
        String normalisedEmail = email == null ? "" : email.toLowerCase().trim();
        User user = users.findByEmail(normalisedEmail).orElse(null);

        if (password == null || user == null || !user.hasPassword()) {
            passwordEncoder.matches(password == null ? "" : password, timingEqualiser);
            throw new BadCredentialsException();
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException();
        }
        return user;
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

    // A fresh token for someone already signed in, so a session that's being
    // used never runs out (see jwt.expiry-hours). The old token keeps working
    // until it expires; signing out ends both.
    public AuthResponse refresh(User user) {
        return respondWithToken(user);
    }

    private AuthResponse respondWithToken(User user) {
        return new AuthResponse(
                jwtService.generateToken(user),
                user.getName(),
                user.getEmail());
    }
}
