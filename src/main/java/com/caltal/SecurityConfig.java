package com.caltal;

import jakarta.servlet.DispatcherType;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

@Configuration
public class SecurityConfig {

    // Limits where the browser will load anything from. The session token lives
    // in localStorage, which any script on the page can read — so the real
    // defence is making sure no script but our own can ever run. Inline styles
    // are allowed because the map library and React's style props both rely on
    // them; scripts get no such exception.
    //
    // accounts.google.com/gsi/ is the one outside origin allowed to run code: it's
    // Google's own sign-in script, and the button it draws lives in an iframe.
    // The paths are as narrow as Google's documentation allows.
    //
    // api.maptiler.com serves the map (its style, tiles, fonts and icons, all
    // fetched by script) and the place search. The map library's background
    // worker is a file on this site, so 'self' covers it.
    //
    // Voice notes play from blob: addresses: the page fetches the recording
    // with the sign-in token, then hands it to the browser's audio player.
    private static final String CONTENT_SECURITY_POLICY = String.join("; ",
            "default-src 'self'",
            "script-src 'self' https://accounts.google.com/gsi/client",
            "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
            "frame-src https://accounts.google.com/gsi/",
            "img-src 'self' data: blob: https://api.maptiler.com",
            "connect-src 'self' https://accounts.google.com/gsi/ https://api.maptiler.com",
            "worker-src 'self'",
            "media-src 'self' blob:",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'");

    // The website's own pages (WebPageController). Public, like the rest of the
    // React app: what's behind sign-in is the API they call, not the page.
    static final String[] PAGES = {
            "/reset-password", "/verify-email",
            "/settings", "/places", "/terms", "/privacy", "/delete-account"
    };

    // Only the browser features Caltal actually uses: location for geofencing,
    // camera and microphone for the planned voice and video notes.
    private static final String PERMISSIONS_POLICY =
            "geolocation=(self), camera=(self), microphone=(self), payment=(), usb=()";

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // When a request fails before reaching a controller (an
                        // upload over the size limit, a path that doesn't exist),
                        // Spring forwards it to its error page. That second pass
                        // isn't signed in, so without this every such error came
                        // back as 401 instead of its real status, and the app
                        // took a 401 to mean the session was over.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // Signing out needs to know who is signing out, so it
                        // must come before the rule that opens up /api/auth/**.
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // The React app itself is public; the API behind it is not.
                        // Anything in frontend/public lands at the root, so match
                        // by file type rather than listing each file by name.
                        .requestMatchers(HttpMethod.GET,
                                "/", "/index.html", "/assets/**",
                                "/*.png", "/*.webp", "/*.svg", "/*.ico")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, PAGES).permitAll()
                        .anyRequest().authenticated())
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY))
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY)))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}