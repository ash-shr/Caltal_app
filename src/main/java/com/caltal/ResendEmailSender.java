package com.caltal;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// Sends email through Resend (resend.com) with one HTTPS call per email.
// Chosen for a free tier that's plenty for now and an API that's a single
// POST, so no extra library is needed.
class ResendEmailSender implements EmailSender {

    static final String API = "https://api.resend.com";

    private final RestClient client;
    private final String from;

    // The builder comes in from outside so tests can point it at a fake server,
    // and EmailConfig can give it timeouts.
    ResendEmailSender(RestClient.Builder builder, String apiKey, String from) {
        this.client = builder
                .baseUrl(API)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                // Resend refuses any request without a User-Agent
                .defaultHeader(HttpHeaders.USER_AGENT, "caltal/1.0")
                .build();
        this.from = from;
    }

    @Override
    public void send(Email email) {
        try {
            client.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "from", from,
                            "to", List.of(email.to()),
                            "subject", email.subject(),
                            "text", email.text(),
                            "html", email.html()))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException failure) {
            // Covers both "couldn't reach Resend" and "Resend said no" (a bad
            // key, an unverified sender, the daily allowance used up)
            throw new EmailNotSentException("Couldn't send the email just now. Try again later.", failure);
        }
    }
}
