package com.caltal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// With the real security rules: someone opening a link from an email usually
// isn't signed in on that browser, and must still get the page.
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
    @ValueSource(strings = { "/reset-password", "/verify-email" })
    void emailedLinksOpenTheWebsiteWithoutSigningIn(String page) throws Exception {
        mockMvc.perform(get(page))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
