package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import io.jsonwebtoken.MalformedJwtException;

class JwtAuthFilterTest {

    private final JwtService jwtService = mock(JwtService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService, users);

    @AfterEach
    void forgetWhoIsSignedIn() {
        SecurityContextHolder.clearContext();
    }

    private void sendWithToken(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/tasks");
        request.addHeader("Authorization", "Bearer " + token);
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }

    private String signedInAs() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? null : authentication.getName();
    }

    @Test
    void acceptsACurrentToken() throws Exception {
        User user = new User("ash@example.com", "hash", "Ash");
        when(jwtService.parse("current")).thenReturn(new JwtService.TokenClaims("ash@example.com", 0));
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(user));

        sendWithToken("current");

        assertEquals("ash@example.com", signedInAs());
    }

    @Test
    void refusesATokenIssuedBeforeTheUserSignedOut() throws Exception {
        User user = new User("ash@example.com", "hash", "Ash");
        user.revokeTokens();
        when(jwtService.parse("stale")).thenReturn(new JwtService.TokenClaims("ash@example.com", 0));
        when(users.findByEmail("ash@example.com")).thenReturn(Optional.of(user));

        sendWithToken("stale");

        assertNull(signedInAs());
    }

    @Test
    void refusesATokenForAnAccountThatNoLongerExists() throws Exception {
        when(jwtService.parse("orphan")).thenReturn(new JwtService.TokenClaims("gone@example.com", 0));
        when(users.findByEmail("gone@example.com")).thenReturn(Optional.empty());

        sendWithToken("orphan");

        assertNull(signedInAs());
    }

    @Test
    void refusesAForgedToken() throws Exception {
        when(jwtService.parse("forged")).thenThrow(new MalformedJwtException("bad signature"));

        sendWithToken("forged");

        assertNull(signedInAs());
    }
}
