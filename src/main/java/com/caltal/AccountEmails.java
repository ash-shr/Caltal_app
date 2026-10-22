package com.caltal;

import org.springframework.web.util.HtmlUtils;

// The wording of the account emails.
//
// Neither email includes anything the person typed, not even their name.
// Anyone can sign up with someone else's address, and a name like "Your bank
// account is locked, call 0800..." would otherwise land in a stranger's inbox
// looking like it came from Caltal.
final class AccountEmails {

    private AccountEmails() {
    }

    static EmailSender.Email confirmEmail(String to, String link) {
        return email(to,
                "Confirm your email for Caltal",
                "Confirm your email",
                "Tap the button to confirm this is your email address. "
                        + "It means you can reset your password if you ever forget it.",
                "Confirm email",
                link,
                "The link works for 48 hours. If you didn't make a Caltal account, "
                        + "ignore this email and nothing will happen.");
    }

    // The code goes in the subject too, so it can be read straight from the
    // phone's notification without opening the email.
    static EmailSender.Email confirmationCode(String to, String code) {
        String subject = code + " is your Caltal code";
        String heading = "Confirm your email";
        String body = "Enter this code in Caltal to confirm your email address and finish "
                + "setting up your account.";
        String footer = "The code works for 15 minutes. If you didn't make a Caltal account, "
                + "ignore this email and nothing will happen.";

        String text = heading + "\n\n" + body + "\n\n" + code + "\n\n" + footer + "\n";

        String html = """
                <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;\
                max-width:480px;margin:0 auto;padding:32px 24px;color:#292524">
                  <p style="font-size:20px;font-weight:600;margin:0 0 24px">Caltal</p>
                  <p style="font-size:18px;font-weight:600;margin:0 0 12px">%s</p>
                  <p style="font-size:15px;line-height:22px;margin:0 0 20px">%s</p>
                  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 20px;\
                font-family:Menlo,Consolas,monospace">%s</p>
                  <p style="font-size:13px;line-height:19px;color:#78716c;margin:0">%s</p>
                </div>
                """.formatted(escape(heading), escape(body), escape(code), escape(footer));

        return new EmailSender.Email(to, subject, text, html);
    }

    static EmailSender.Email resetPassword(String to, String link) {
        return email(to,
                "Reset your Caltal password",
                "Reset your password",
                "Someone asked to reset the password for the Caltal account that uses this "
                        + "email address. If it was you, tap the button to choose a new one.",
                "Choose a new password",
                link,
                "The link works for one hour and only once. If you didn't ask for this, "
                        + "ignore this email: your password hasn't changed.");
    }

    private static EmailSender.Email email(
            String to, String subject, String heading, String body,
            String button, String link, String footer) {

        String text = heading + "\n\n"
                + body + "\n\n"
                + link + "\n\n"
                + footer + "\n";

        // Inline styles only: most mail apps ignore <style> blocks. Everything
        // that goes in is escaped, even though it's all our own text.
        String html = """
                <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;\
                max-width:480px;margin:0 auto;padding:32px 24px;color:#292524">
                  <p style="font-size:20px;font-weight:600;margin:0 0 24px">Caltal</p>
                  <p style="font-size:18px;font-weight:600;margin:0 0 12px">%s</p>
                  <p style="font-size:15px;line-height:22px;margin:0 0 24px">%s</p>
                  <a href="%s" style="display:inline-block;background:#292524;color:#ffffff;\
                text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;\
                border-radius:10px">%s</a>
                  <p style="font-size:13px;line-height:19px;color:#78716c;margin:24px 0 0">\
                If the button doesn't work, copy this link into your browser:<br>\
                <span style="word-break:break-all">%s</span></p>
                  <p style="font-size:13px;line-height:19px;color:#78716c;margin:16px 0 0">%s</p>
                </div>
                """.formatted(
                        escape(heading), escape(body), escape(link),
                        escape(button), escape(link), escape(footer));

        return new EmailSender.Email(to, subject, text, html);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value);
    }
}
