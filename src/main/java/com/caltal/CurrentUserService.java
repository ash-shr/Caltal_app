package com.caltal;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository users;

    public CurrentUserService(UserRepository users) {
        this.users = users;
    }

    public User get() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return users.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}