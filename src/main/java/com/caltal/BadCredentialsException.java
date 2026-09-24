package com.caltal;

public class BadCredentialsException extends RuntimeException {

    public BadCredentialsException() {
        super("Invalid email or password");
    }
}