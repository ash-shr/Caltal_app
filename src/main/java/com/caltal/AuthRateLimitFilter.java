package com.caltal;

import java.io.IOException;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Caps sign-in and sign-up attempts per client address. Without it, a password
// can be guessed as fast as the server answers, and the sign-up endpoint can be
// used to fill the database. Changing a password and deleting the account both
// check the current password too, so they share the same budget.
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> LIMITED = Set.of(
            "POST /api/auth/login",
            "POST /api/auth/register",
            "POST /api/auth/google",
            "PUT /api/me/password",
            "DELETE /api/me");

    private final RateLimiter limiter;

    public AuthRateLimitFilter(
            @Value("${rate-limit.auth.requests:10}") int requests,
            @Value("${rate-limit.auth.window-seconds:60}") long windowSeconds) {
        this.limiter = new RateLimiter(requests, windowSeconds * 1000, System::currentTimeMillis);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !LIMITED.contains(request.getMethod() + " " + request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        RateLimiter.Decision decision = limiter.check(clientAddress(request));

        if (decision.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(
                "Too many attempts. Try again in " + decision.retryAfterSeconds() + " seconds.");
    }

    // Behind Fly, every request arrives from Fly's proxy, so the socket address is
    // useless. Fly-Client-IP is set by Fly's edge from the real connection.
    // X-Forwarded-For is not used here: its first entry is whatever the client
    // chose to send, so an attacker could claim a fresh address on every attempt.
    static String clientAddress(HttpServletRequest request) {
        String flyClientIp = request.getHeader("Fly-Client-IP");

        if (flyClientIp != null && !flyClientIp.isBlank()) {
            return flyClientIp.trim();
        }

        return request.getRemoteAddr();
    }
}
