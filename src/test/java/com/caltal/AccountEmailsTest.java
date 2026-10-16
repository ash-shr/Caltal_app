package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AccountEmailsTest {

    @Test
    void theResetEmailCarriesTheLinkInBothVersions() {
        String link = "https://caltal.fly.dev/reset-password#token=abc";

        EmailSender.Email email = AccountEmails.resetPassword("ash@example.com", link);

        assertEquals("ash@example.com", email.to());
        assertEquals("Reset your Caltal password", email.subject());
        assertTrue(email.text().contains(link));
        assertTrue(email.html().contains("href=\"" + link + "\""));
    }

    @Test
    void theConfirmationEmailCarriesTheLinkInBothVersions() {
        String link = "https://caltal.fly.dev/verify-email#token=abc";

        EmailSender.Email email = AccountEmails.confirmEmail("ash@example.com", link);

        assertTrue(email.text().contains(link));
        assertTrue(email.html().contains("href=\"" + link + "\""));
    }

    @Test
    void nothingCanBreakOutOfTheHtml() {
        EmailSender.Email email = AccountEmails.resetPassword(
                "ash@example.com", "https://x.example/\"><script>alert(1)</script>");

        assertFalse(email.html().contains("<script>"));
        assertTrue(email.html().contains("&lt;script&gt;"));
    }
}
