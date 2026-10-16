package com.caltal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EmailConfigTest {

    private final EmailConfig config = new EmailConfig();
    private final EmailSender.Email email =
            new EmailSender.Email("ash@example.com", "Subject", "text", "<p>html</p>");

    @Test
    void usesResendWhenThereIsAKey() {
        assertInstanceOf(ResendEmailSender.class,
                config.emailSender("re_key", "Caltal <a@b.example>", "https://caltal.fly.dev"));
    }

    @Test
    void withoutAKeyOnYourOwnComputerEmailsOnlyGoToTheLog() {
        EmailSender sender = config.emailSender("", "Caltal <a@b.example>", "http://localhost:5173");

        assertDoesNotThrow(() -> sender.send(email));
    }

    @Test
    void withoutAKeyOnTheLiveServerNothingIsSentOrLogged() {
        EmailSender sender = config.emailSender(" ", "Caltal <a@b.example>", "https://caltal.fly.dev");

        assertThrows(EmailNotSentException.class, () -> sender.send(email));
    }

    @Test
    void onlyTheMachineItselfCountsAsLocal() {
        assertTrue(EmailConfig.isLocal("http://localhost:5173"));
        assertTrue(EmailConfig.isLocal("http://127.0.0.1:8080"));
        assertFalse(EmailConfig.isLocal("https://caltal.fly.dev"));
        assertFalse(EmailConfig.isLocal("https://localhost.attacker.example"));
        assertFalse(EmailConfig.isLocal("not a web address"));
    }
}
