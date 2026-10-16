package com.caltal;

// Someone has asked for the same kind of email too many times in the last hour.
public class TooManyEmailsException extends RuntimeException {

    public TooManyEmailsException() {
        super("We've already sent a few of these. Check your inbox (and spam folder), "
                + "or try again in an hour.");
    }
}
