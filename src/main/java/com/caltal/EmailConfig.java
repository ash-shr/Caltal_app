package com.caltal;

import java.net.URI;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// Picks how email goes out: through Resend when RESEND_API_KEY is set,
// otherwise the stand-in that only writes to the log on a local machine.
@Configuration
public class EmailConfig {

    private static final Logger log = LoggerFactory.getLogger(EmailConfig.class);

    @Bean
    public EmailSender emailSender(
            @Value("${mail.resend-api-key:}") String apiKey,
            @Value("${mail.from}") String from,
            @Value("${app.url}") String appUrl) {

        if (apiKey == null || apiKey.isBlank()) {
            boolean local = isLocal(appUrl);
            if (!local) {
                log.warn("RESEND_API_KEY isn't set, so no emails will be sent "
                        + "(no password resets, no email confirmations)");
            }
            return new LoggingEmailSender(local);
        }

        // Without timeouts, a slow email service could hold a request open for
        // as long as it liked.
        SimpleClientHttpRequestFactory timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(Duration.ofSeconds(5));
        timeouts.setReadTimeout(Duration.ofSeconds(10));

        return new ResendEmailSender(
                RestClient.builder().requestFactory(timeouts),
                apiKey.trim(),
                from);
    }

    static boolean isLocal(String appUrl) {
        try {
            String host = URI.create(appUrl).getHost();
            return "localhost".equals(host) || "127.0.0.1".equals(host);
        } catch (IllegalArgumentException malformed) {
            return false;
        }
    }
}
