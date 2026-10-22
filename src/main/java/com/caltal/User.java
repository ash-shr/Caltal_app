package com.caltal;

import java.util.regex.Pattern;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_user")
public class User {

    // The longest address the email standards allow
    private static final int MAX_EMAIL_LENGTH = 254;
    private static final int MAX_NAME_LENGTH = 100;

    // Deliberately loose: something@something.something, no spaces. Anything
    // stricter rejects real addresses; the real check is whether mail arrives.
    private static final Pattern EMAIL_SHAPE = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    // Null for accounts that only ever sign in with Google
    @Column
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int tokenVersion;

    @Column(nullable = false)
    private boolean emailVerified;

    @Column(unique = true)
    private String googleSubject;

    protected User() {
    }

    public User(String email, String passwordHash, String name) {
        setEmail(email);
        this.passwordHash = passwordHash;
        setName(name);
    }

    // Google has already verified the address, so the account starts verified
    // and needs no password.
    public static User fromGoogle(String email, String name, String googleSubject) {
        User user = new User();
        user.setEmail(email);
        user.setName(name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name);
        user.googleSubject = googleSubject;
        user.emailVerified = true;
        return user;
    }

    // Google has just proved this person controls the email address. If the
    // account was never verified, anyone could have created it — including
    // someone squatting on an address that isn't theirs, waiting for the real
    // owner to arrive. So an unverified account's password is removed and every
    // existing session revoked: whoever set that password loses access, and the
    // proven owner keeps the account.
    public void attachGoogle(String subject) {
        if (!emailVerified) {
            passwordHash = null;
            revokeTokens();
        }
        googleSubject = subject;
        emailVerified = true;
    }

    public boolean hasPassword() {
        return passwordHash != null;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public String getGoogleSubject() {
        return googleSubject;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getName() {
        return name;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }

    // Every token issued before this call stops working.
    public void revokeTokens() {
        tokenVersion++;
    }

    // A new password also ends every existing session. If it was changed because
    // someone else knew the old one, they lose access along with it.
    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        revokeTokens();
    }

    // A password set from an emailed reset link. Whoever used the link can read
    // this account's inbox, so the address is proven real as well. Every old
    // session ends, as with any new password: if the reset happened because
    // someone else had the old password, they're now signed out.
    public void resetPassword(String newPasswordHash) {
        changePassword(newPasswordHash);
        emailVerified = true;
    }

    public void markEmailVerified() {
        emailVerified = true;
    }

    // Signing up again with an address that was never confirmed. Nobody has
    // proved that account is theirs, so it doesn't block the address: the new
    // sign-up takes it over, with its own password and name, and whoever made
    // the first one loses it. Only whoever can read the inbox can then confirm.
    public void restartSignUp(String newPasswordHash, String newName) {
        if (emailVerified) {
            throw new IllegalStateException("A confirmed account can't be signed up for again");
        }
        setName(newName);
        changePassword(newPasswordHash);
    }

    public void setEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email must not be empty");
        }

        String cleaned = email.toLowerCase().trim();

        if (cleaned.length() > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Email must be valid");
        }

        this.email = cleaned;
    }

    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name must not be empty");
        }

        String cleaned = name.trim();

        if (cleaned.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException(
                    "Name must be " + MAX_NAME_LENGTH + " characters or fewer");
        }

        this.name = cleaned;
    }
}
