package com.caltal;

import java.util.Objects;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Forgot password, and confirming that an email address is real. Both work by
// emailing a one-time link to the address on the account: only whoever can
// read that inbox can use it.
//
// The links go to the website (APP_URL), which has a page for each. The
// address always comes from configuration, never from the request: a request
// can claim to be for any website, and a reset link pointing somewhere an
// attacker controls would hand them the secret.
@Service
public class AccountEmailService {

    private static final Logger log = LoggerFactory.getLogger(AccountEmailService.class);

    private final UserRepository users;
    private final AccountTokenService tokens;
    private final EmailCodeService codes;
    private final EmailSender sender;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String appUrl;
    private final Executor background;

    @Autowired
    public AccountEmailService(
            UserRepository users,
            AccountTokenService tokens,
            EmailCodeService codes,
            EmailSender sender,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.url}") String appUrl) {
        // A lightweight (virtual) thread per email: sending waits on the email
        // service, and that wait shouldn't hold up the person's request.
        this(users, tokens, codes, sender, passwordEncoder, jwtService, appUrl,
                Executors.newVirtualThreadPerTaskExecutor());
    }

    // Tests pass an Executor that runs the work straight away (Runnable::run)
    AccountEmailService(
            UserRepository users,
            AccountTokenService tokens,
            EmailCodeService codes,
            EmailSender sender,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            String appUrl,
            Executor background) {
        this.users = users;
        this.tokens = tokens;
        this.codes = codes;
        this.sender = sender;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
        this.background = background;
    }

    // ---- Forgot password ----------------------------------------------------

    // Answers the same way, just as quickly, whether or not the email has an
    // account. All the work happens in the background, after the reply has
    // gone. Otherwise the reply would take longer when there IS an account
    // (looking it up, contacting the email service), and the delay alone would
    // tell anyone which addresses are signed up.
    public void requestPasswordReset(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Enter your email address");
        }

        String normalisedEmail = email.toLowerCase().trim();

        background.execute(() -> {
            try {
                users.findByEmail(normalisedEmail).ifPresent(user -> {
                    String secret = tokens.issue(user, TokenPurpose.RESET_PASSWORD);
                    sender.send(AccountEmails.resetPassword(
                            user.getEmail(), link("/reset-password", secret)));
                });
            } catch (TooManyEmailsException tooMany) {
                log.info("Password reset not sent: too many asked for in the last hour");
            } catch (EmailNotSentException notSent) {
                log.warn("Password reset email not sent: {}", notSent.getMessage());
            } catch (RuntimeException failure) {
                log.warn("Password reset email failed", failure);
            }
        });
    }

    // The secret from the link, and the new password. Signs the person in.
    //
    // Works for an account that only ever used Google too: the link proves
    // they own the inbox, so they're allowed to add a password.
    @Transactional
    public AuthResponse resetPassword(String secret, String newPassword) {
        // Before using the link up, so a too-short password doesn't waste it
        PasswordPolicy.check(newPassword);

        AccountToken token = tokens.findUsable(secret, TokenPurpose.RESET_PASSWORD);
        tokens.claim(token);

        User user = token.getUser();
        user.resetPassword(passwordEncoder.encode(newPassword));
        users.save(user);

        return new AuthResponse(jwtService.generateToken(user), user.getName(), user.getEmail());
    }

    // ---- Confirming the email address with a code ---------------------------

    // After signing up, or signing in to an account that hasn't been confirmed
    // yet. In the background, so the reply doesn't wait on the email service.
    // If it fails, the person can ask for another code (sendCodeNow).
    public void sendCode(User user) {
        background.execute(() -> {
            try {
                sendCodeNow(user);
            } catch (TooManyEmailsException tooMany) {
                log.info("Confirmation code not sent: too many asked for in the last hour");
            } catch (EmailNotSentException notSent) {
                log.warn("Confirmation code not sent: {}", notSent.getMessage());
            } catch (RuntimeException failure) {
                log.warn("Confirmation code email failed", failure);
            }
        });
    }

    // "Send a new code". The person is waiting on the answer, so a failure is
    // reported back to them rather than only logged.
    public void sendCodeNow(User user) {
        String code = codes.issue(user);
        sender.send(AccountEmails.confirmationCode(user.getEmail(), code));
    }

    // ---- Confirming the email address with a link ---------------------------
    // Accounts made before codes were sent a link instead. Those links still
    // work, for someone signed in.

    // "Send it again" from Settings. Here the person is waiting on the answer,
    // so a failure is reported back to them rather than only logged.
    public void sendConfirmation(User user) {
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Your email is already confirmed");
        }
        sendConfirmationNow(user);
    }

    // The link only works for someone signed in to the same account.
    //
    // Anyone can sign up with an address that isn't theirs. Without this, the
    // real owner might tap "Confirm" in an email they weren't expecting and
    // vouch for an account a stranger holds the password to. That matters:
    // a confirmed account keeps its password when its owner later signs in
    // with Google (see User.attachGoogle), so the stranger would keep access.
    // Asking for the password first means only whoever set it can confirm.
    @Transactional
    public User confirmEmail(User signedIn, String secret) {
        if (signedIn.isEmailVerified()) {
            return signedIn;
        }

        AccountToken token = tokens.findUsable(secret, TokenPurpose.VERIFY_EMAIL);
        User owner = token.getUser();

        if (!Objects.equals(owner.getId(), signedIn.getId())) {
            throw new IllegalArgumentException(
                    "This link is for a different Caltal account. Sign out, then sign in "
                            + "to the account it was sent to.");
        }

        tokens.claim(token);
        owner.markEmailVerified();
        return users.save(owner);
    }

    private void sendConfirmationNow(User user) {
        String secret = tokens.issue(user, TokenPurpose.VERIFY_EMAIL);
        sender.send(AccountEmails.confirmEmail(user.getEmail(), link("/verify-email", secret)));
    }

    // The secret goes after the #, not in a ?query. Browsers never send the part
    // after # to any server, so it can't end up in a log or be passed on to
    // another site as the page's address.
    private String link(String page, String secret) {
        return appUrl + page + "#token=" + secret;
    }
}
