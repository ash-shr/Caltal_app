package com.caltal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Stands in for a real email service when RESEND_API_KEY isn't set.
//
// On your own computer it prints each email in the server log instead, links
// and all, so the whole flow can be tried without sending anything. Anywhere
// else it refuses: a reset link in a server log would let anyone who can read
// the logs take over that account.
class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    private final boolean local;

    LoggingEmailSender(boolean local) {
        this.local = local;
    }

    @Override
    public void send(Email email) {
        if (!local) {
            throw new EmailNotSentException("Email isn't set up on this server yet.");
        }

        log.info("Email not sent (no RESEND_API_KEY). It would have gone to {}:\n{}\n\n{}",
                email.to(), email.subject(), email.text());
    }
}
