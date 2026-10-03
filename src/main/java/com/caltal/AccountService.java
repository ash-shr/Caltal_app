package com.caltal;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Everything a signed-in person can change about their own account. Every
// method takes the User from the token (via CurrentUserService), never an id
// from the request, so nobody can reach someone else's account through here.
@Service
public class AccountService {

    private final UserRepository users;
    private final TaskRepository tasks;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AccountService(
            UserRepository users,
            TaskRepository tasks,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.users = users;
        this.tasks = tasks;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public User rename(User user, String name) {
        user.setName(name);
        return users.save(user);
    }

    public AuthResponse changePassword(User user, String currentPassword, String newPassword) {
        if (!user.hasPassword()) {
            throw new IllegalArgumentException(
                    "This account signs in with Google, so it has no password to change");
        }

        requireCorrectPassword(user, currentPassword);
        PasswordPolicy.check(newPassword);

        user.changePassword(passwordEncoder.encode(newPassword));
        users.save(user);

        // Changing the password revoked every token, including the one that made
        // this request, so hand back a fresh one to stay signed in on this device.
        return new AuthResponse(jwtService.generateToken(user), user.getName(), user.getEmail());
    }

    // Tasks first, then the user: each task points at its owner, so the database
    // refuses to remove a user who still owns anything. @Transactional makes the
    // two steps one — if the second fails, the tasks come back.
    @Transactional
    public void deleteAccount(User user, String password) {
        if (user.hasPassword()) {
            requireCorrectPassword(user, password);
        }

        tasks.deleteAllByOwner(user);
        users.delete(user);
    }

    private void requireCorrectPassword(User user, String password) {
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            // A 400, deliberately not a 401. The request itself was properly
            // signed in; only the password typed into the form was wrong. A 401
            // would make the app think the session had ended and sign them out.
            throw new IllegalArgumentException("Current password is incorrect");
        }
    }
}
