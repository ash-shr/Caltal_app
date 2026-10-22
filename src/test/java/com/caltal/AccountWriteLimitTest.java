package com.caltal;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccountWriteLimitTest {

    // Two saves a minute, so the limit is easy to reach
    private final AccountWriteLimit limit = new AccountWriteLimit(2, 60);

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    private void signInAs(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, List.of()));
    }

    private MockHttpServletResponse send(String method) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean carryOn = limit.preHandle(
                new MockHttpServletRequest(method, "/api/tasks"), response, new Object());
        if (carryOn) {
            response.setStatus(200);
        }
        return response;
    }

    @Test
    void stopsAnAccountThatSavesTooOftenAndSaysWhenToTryAgain() throws Exception {
        signInAs("a@example.com");

        assertEquals(200, send("POST").getStatus());
        assertEquals(200, send("PUT").getStatus());
        MockHttpServletResponse third = send("DELETE");

        assertEquals(429, third.getStatus());
        assertNotNull(third.getHeader("Retry-After"));
        assertTrue(third.getContentAsString().contains("too quickly"));
    }

    @Test
    void neverLimitsReading() throws Exception {
        signInAs("a@example.com");

        for (int i = 0; i < 10; i++) {
            assertEquals(200, send("GET").getStatus());
        }
    }

    @Test
    void countsEachAccountSeparately() throws Exception {
        signInAs("a@example.com");
        send("POST");
        send("POST");
        assertEquals(429, send("POST").getStatus());

        signInAs("b@example.com");
        assertEquals(200, send("POST").getStatus());
    }

    @Test
    void leavesRequestsThatArentSignedInToTheSecurityRules() throws Exception {
        // Nobody signed in: the security rules decide, not this limit
        for (int i = 0; i < 5; i++) {
            assertEquals(200, send("POST").getStatus());
        }
    }
}
