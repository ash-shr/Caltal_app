package com.caltal;

import java.time.Duration;

// What an emailed link is for, and how long it keeps working.
//
// A reset link is short-lived: it's as good as the password while it lasts.
// A confirmation link only proves the address is real, so it can wait for
// someone who doesn't check their email every day.
public enum TokenPurpose {
    VERIFY_EMAIL(Duration.ofHours(48)),
    RESET_PASSWORD(Duration.ofHours(1));

    private final Duration lifetime;

    TokenPurpose(Duration lifetime) {
        this.lifetime = lifetime;
    }

    public Duration lifetime() {
        return lifetime;
    }
}
