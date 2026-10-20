package com.caltal;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// With the real security rules (SecurityConfig), so these also check that the
// two endpoints work for someone who isn't signed in, which is the whole point.
@WebMvcTest(controllers = AuthController.class, properties = "rate-limit.auth.requests=1000")
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private CurrentUserService currentUser;

    @MockitoBean
    private AccountEmailService accountEmails;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void forgotPasswordAlwaysJustSaysDone() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ash@example.com\"}"))
                .andExpect(status().isNoContent());

        verify(accountEmails).requestPasswordReset("ash@example.com");
    }

    @Test
    void forgotPasswordWithNoEmailIsABadRequest() throws Exception {
        doThrow(new IllegalArgumentException("Enter your email address"))
                .when(accountEmails).requestPasswordReset("");

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resettingThePasswordSignsYouIn() throws Exception {
        when(accountEmails.resetPassword("s3cret", "brand-new-pass"))
                .thenReturn(new AuthResponse("fresh-token", "Ash", "ash@example.com"));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"s3cret\",\"password\":\"brand-new-pass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("fresh-token"));
    }

    @Test
    void aDeadResetLinkIsABadRequestThatSaysSo() throws Exception {
        when(accountEmails.resetPassword("old", "brand-new-pass"))
                .thenThrow(new IllegalArgumentException(AccountTokenService.DEAD_LINK));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"old\",\"password\":\"brand-new-pass\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(AccountTokenService.DEAD_LINK));
    }
}
