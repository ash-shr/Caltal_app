package com.caltal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MeController.class)
class MeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accounts;

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
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
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
