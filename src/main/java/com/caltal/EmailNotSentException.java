package com.caltal;

// The email service couldn't be reached, refused the email, or isn't set up.
public class EmailNotSentException extends RuntimeException {

    public EmailNotSentException(String message) {
        super(message);
    }

    public EmailNotSentException(String message, Throwable cause) {
        super(message, cause);
    }
}
