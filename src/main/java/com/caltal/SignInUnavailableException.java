package com.caltal;

// A sign-in method exists in the code but isn't configured on this server —
// for example, Google sign-in with no client ID set.
public class SignInUnavailableException extends RuntimeException {

    public SignInUnavailableException(String message) {
        super(message);
    }
}
