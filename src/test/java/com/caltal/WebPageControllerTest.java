package com.caltal;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// With the real security rules: someone opening a link from an email usually
// isn't signed in on that browser, and must still get the page. The privacy
// policy and delete-your-account page must be public (Google Play checks
// them), and the site's other pages must load too, before sign-in has been
// checked (the React app does that), or reloading them would fail.
@WebMvcTest(WebPageController.class)
@Import(SecurityConfig.class)
class WebPageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // JwtAuthFilter needs these
    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @ParameterizedTest
    @ValueSource(strings = {
            "/reset-password", "/verify-email",
            "/settings", "/places", "/terms", "/privacy", "/delete-account"
    })
    void theWebsitesPagesAllOpenTheReactApp(String page) throws Exception {
        mockMvc.perform(get(page))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void everyPageCarriesTheContentSecurityPolicy() throws Exception {
        mockMvc.perform(get("/settings"))
                .andExpect(header().string("Content-Security-Policy",
                        containsString("connect-src 'self' https://accounts.google.com/gsi/ https://api.maptiler.com")))
                .andExpect(header().string("Content-Security-Policy",
                        containsString("worker-src 'self'")))
                .andExpect(header().string("Content-Security-Policy",
                        containsString("media-src 'self' blob:")));
    }

    @Test
    void theApiStillNeedsSigningIn() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }
}
