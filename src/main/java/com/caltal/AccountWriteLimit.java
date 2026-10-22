package com.caltal;

import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Caps how fast one account can change things: adding, editing and deleting
// tasks, places and voice notes. Reading isn't limited. A person tapping away
// comes nowhere near it; it's there so a script using someone's sign-in can't
// hammer the server or fill the database. Sign-in and sign-up have their own,
// stricter limit by address (AuthRateLimitFilter), and aren't counted here.
@Component
public class AccountWriteLimit implements HandlerInterceptor, WebMvcConfigurer {

    private static final Set<String> WRITES = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final RateLimiter limiter;

    public AccountWriteLimit(
            @Value("${rate-limit.writes.requests:60}") int requests,
            @Value("${rate-limit.writes.window-seconds:60}") long windowSeconds) {
        this.limiter = new RateLimiter(requests, windowSeconds * 1000, System::currentTimeMillis);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**");
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        if (!WRITES.contains(request.getMethod())) {
            return true;
        }

        // Signed-in requests only; the security rules turn the rest away anyway
        Authentication signedIn = SecurityContextHolder.getContext().getAuthentication();
        if (signedIn == null
                || !signedIn.isAuthenticated()
                || signedIn instanceof AnonymousAuthenticationToken) {
            return true;
        }

        RateLimiter.Decision decision = limiter.check(signedIn.getName());
        if (decision.allowed()) {
            return true;
        }

        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(
                "You're saving changes too quickly. Please wait a minute and try again.");
        return false;
    }
}
