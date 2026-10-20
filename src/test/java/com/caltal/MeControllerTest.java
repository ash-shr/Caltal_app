package com.caltal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// A high limit: every test here shares one rate limiter, and several of these
// endpoints are limited.
@WebMvcTest(controllers = MeController.class, properties = "rate-limit.auth.requests=1000")
class MeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accounts;

    @MockitoBean
    private AccountEmailService accountEmails;

    @MockitoBean
    private CurrentUserService currentUser;

    @MockitoBean
    private JwtService jwtService;

    // JwtAuthFilter looks users up to check their token version
    @MockitoBean
    private UserRepository userRepository;

    private final User ash = new User("ash@example.com", "hash", "Ash");

    @Test
    @WithMockUser
    void saysWhoIsSignedInWithoutRevealingThePasswordHash() throws Exception {
        when(currentUser.get()).thenReturn(ash);

        mockMvc.perform(get("/api/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ash"))
                .andExpect(jsonPath("$.email").value("ash@example.com"))
                .andExpect(jsonPath("$.hasPassword").value(true))
                .andExpect(jsonPath("$.emailVerified").value(false))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @WithMockUser
    void sendsAnotherConfirmationEmail() throws Exception {
        when(currentUser.get()).thenReturn(ash);

        mockMvc.perform(post("/api/me/verify-email").with(csrf()))
                .andExpect(status().isNoContent());

        verify(accountEmails).sendConfirmation(ash);
    }

    @Test
    @WithMockUser
    void tooManyConfirmationEmailsIsA429() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        doThrow(new TooManyEmailsException()).when(accountEmails).sendConfirmation(ash);

        mockMvc.perform(post("/api/me/verify-email").with(csrf()))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @WithMockUser
    void anEmailServiceProblemIsA503NotASignOut() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        doThrow(new EmailNotSentException("Couldn't send the email just now. Try again later."))
                .when(accountEmails).sendConfirmation(ash);

        mockMvc.perform(post("/api/me/verify-email").with(csrf()))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    @WithMockUser
    void confirmsTheEmailWithTheTokenFromTheLink() throws Exception {
        User confirmed = User.fromGoogle("ash@example.com", "Ash", "google-1");
        when(currentUser.get()).thenReturn(ash);
        when(accountEmails.confirmEmail(ash, "secret-from-link")).thenReturn(confirmed);

        mockMvc.perform(post("/api/me/verify-email/confirm")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"secret-from-link\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));
    }

    @Test
    @WithMockUser
    void aDeadConfirmationLinkIsABadRequest() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(accountEmails.confirmEmail(any(User.class), eq("old-secret")))
                .thenThrow(new IllegalArgumentException(AccountTokenService.DEAD_LINK));

        mockMvc.perform(post("/api/me/verify-email/confirm")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"old-secret\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmingNeedsYouToBeSignedIn() throws Exception {
        mockMvc.perform(post("/api/me/verify-email/confirm")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"secret-from-link\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void renamesTheSignedInUser() throws Exception {
        User renamed = new User("ash@example.com", "hash", "Ashutosh");
        when(currentUser.get()).thenReturn(ash);
        when(accounts.rename(ash, "Ashutosh")).thenReturn(renamed);

        mockMvc.perform(put("/api/me")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ashutosh\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ashutosh"));
    }

    @Test
    @WithMockUser
    void aWrongCurrentPasswordIsABadRequestNotASignOut() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(accounts.changePassword(any(User.class), eq("wrong"), eq("brand-new-pass")))
                .thenThrow(new IllegalArgumentException("Current password is incorrect"));

        mockMvc.perform(put("/api/me/password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"brand-new-pass\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void changingThePasswordHandsBackAFreshToken() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(accounts.changePassword(ash, "current-pass", "brand-new-pass"))
                .thenReturn(new AuthResponse("fresh-token", "Ash", "ash@example.com"));

        mockMvc.perform(put("/api/me/password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"current-pass\",\"newPassword\":\"brand-new-pass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("fresh-token"));
    }

    @Test
    @WithMockUser
    void deletesTheAccountWithAPassword() throws Exception {
        when(currentUser.get()).thenReturn(ash);

        mockMvc.perform(delete("/api/me")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"current-pass\"}"))
                .andExpect(status().isNoContent());

        verify(accounts).deleteAccount(ash, "current-pass");
    }

    @Test
    @WithMockUser
    void deletesAGoogleOnlyAccountWithNoBody() throws Exception {
        when(currentUser.get()).thenReturn(ash);

        mockMvc.perform(delete("/api/me").with(csrf()))
                .andExpect(status().isNoContent());

        verify(accounts).deleteAccount(eq(ash), isNull());
    }

    @Test
    void refusesAnyoneWhoIsNotSignedIn() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }
}
