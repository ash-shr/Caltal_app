package com.caltal;

// Sends one email. Throws EmailNotSentException if it can't.
//
// An interface so the rest of the app doesn't care which email service is
// behind it, and tests can check what would have been sent without sending it.
public interface EmailSender {

    // Every email goes out as both plain text and HTML. Mail apps show the HTML;
    // the text version is for the ones that can't, and spam filters trust an
    // email more when it has both.
    record Email(String to, String subject, String text, String html) {
    }

    void send(Email email);
}
