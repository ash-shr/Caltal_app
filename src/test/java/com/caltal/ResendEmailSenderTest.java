package com.caltal;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

// Nothing leaves the computer: MockRestServiceServer stands in for Resend and
// checks the request that would have been sent.
class ResendEmailSenderTest {

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer resend = MockRestServiceServer.bindTo(builder).build();
    private final ResendEmailSender sender =
            new ResendEmailSender(builder, "re_test_key", "Caltal <hello@caltal.example>");

    private final EmailSender.Email email =
            new EmailSender.Email("ash@example.com", "Reset your Caltal password", "text", "<p>html</p>");

    @Test
    void postsTheEmailToResendWithTheKeyAndAUserAgent() {
        resend.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer re_test_key"))
                .andExpect(header("User-Agent", "caltal/1.0"))
                .andExpect(jsonPath("$.from").value("Caltal <hello@caltal.example>"))
                .andExpect(jsonPath("$.to[0]").value("ash@example.com"))
                .andExpect(jsonPath("$.subject").value("Reset your Caltal password"))
                .andExpect(jsonPath("$.text").value("text"))
                .andExpect(jsonPath("$.html").value("<p>html</p>"))
                .andRespond(withSuccess("{\"id\":\"49a3999c\"}", MediaType.APPLICATION_JSON));

        sender.send(email);

        resend.verify();
    }

    @Test
    void aRefusalFromResendIsReportedAsNotSent() {
        resend.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN));

        assertThrows(EmailNotSentException.class, () -> sender.send(email));
    }

    @Test
    void notReachingResendIsReportedAsNotSent() {
        resend.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(request -> {
                    throw new IOException("Network is unreachable");
                });

        assertThrows(EmailNotSentException.class, () -> sender.send(email));
    }
}
