package com.caltal;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(String email, String password, String name) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        String normalisedEmail = email == null ? null : email.toLowerCase().trim();

        if (normalisedEmail != null && users.existsByEmail(normalisedEmail)) {
            throw new IllegalArgumentException("An account with that email already exists");
        }

        User user = new User(email, passwordEncoder.encode(password), name);
        users.save(user);

        return new AuthResponse(
                jwtService.generateToken(user.getEmail()),
                user.getName(),
                user.getEmail());
    }

    public AuthResponse login(String email, String password) {
        String normalisedEmail = email == null ? "" : email.toLowerCase().trim();

        User user = users.findByEmail(normalisedEmail)
                .orElseThrow(() -> new BadCredentialsException());

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException();
        }

        return new AuthResponse(
                jwtService.generateToken(user.getEmail()),
                user.getName(),
                user.getEmail());
    }
}