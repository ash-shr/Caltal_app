package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {

    private MockHttpServletResponse send(AuthRateLimitFilter filter, String method, String path, String ip)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("Fly-Client-IP", ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void refusesSignInAttemptsPastTheLimitWith429() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(2, 60);

        assertEquals(200, send(filter, "POST", "/api/auth/login", "1.2.3.4").getStatus());
        assertEquals(200, send(filter, "POST", "/api/auth/login", "1.2.3.4").getStatus());

        MockHttpServletResponse blocked = send(filter, "POST", "/api/auth/login", "1.2.3.4");

        assertEquals(429, blocked.getStatus());
        assertNotNull(blocked.getHeader("Retry-After"));
        assertEquals("Too many attempts. Please wait a minute and try again.",
                blocked.getContentAsString());
    }

    @Test
    void sharesOneBudgetBetweenSignInAndSignUp() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(1, 60);
        send(filter, "POST", "/api/auth/register", "1.2.3.4");

        assertEquals(429, send(filter, "POST", "/api/auth/login", "1.2.3.4").getStatus());
    }

    @Test
    void alsoLimitsTheRequestsThatCheckTheCurrentPassword() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(1, 60);
        send(filter, "PUT", "/api/me/password", "1.2.3.4");

        assertEquals(429, send(filter, "DELETE", "/api/me", "1.2.3.4").getStatus());
    }

    @Test
    void alsoLimitsTheRequestsThatSendEmailsOrUseEmailedLinks() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(3, 60);
        send(filter, "POST", "/api/auth/forgot-password", "1.2.3.4");
        send(filter, "POST", "/api/auth/reset-password", "1.2.3.4");
        send(filter, "POST", "/api/me/verify-email", "1.2.3.4");

        assertEquals(429, send(filter, "POST", "/api/me/verify-email/confirm", "1.2.3.4").getStatus());
    }

    @Test
    void longerWaitsAreGivenInMinutes() {
        assertEquals("Too many attempts. Please wait 3 minutes and try again.",
                AuthRateLimitFilter.message(150));
    }

    @Test
    void leavesTheRestOfTheApiAlone() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(1, 60);

        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = send(filter, "GET", "/api/tasks", "1.2.3.4");
            assertEquals(200, response.getStatus());
            assertNull(response.getHeader("Retry-After"));
        }
    }

    @Test
    void identifiesClientsByFlysHeaderRatherThanTheProxyAddress() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("172.16.0.1");
        request.addHeader("Fly-Client-IP", "81.2.69.160");

        assertEquals("81.2.69.160", AuthRateLimitFilter.clientAddress(request));
    }

    @Test
    void fallsBackToTheSocketAddressOffFly() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("127.0.0.1");

        assertEquals("127.0.0.1", AuthRateLimitFilter.clientAddress(request));
    }
}
