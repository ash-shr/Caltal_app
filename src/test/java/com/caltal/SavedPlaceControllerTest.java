package com.caltal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
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

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SavedPlaceController.class)
class SavedPlaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SavedPlaceService service;

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
    void listsPlacesWithoutRevealingTheOwner() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(service.list(ash)).thenReturn(List.of(
                new SavedPlace(ash, "Home", 53.8, -1.55, "Leeds")));

        mockMvc.perform(get("/api/places"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Home"))
                .andExpect(jsonPath("$[0].latitude").value(53.8))
                .andExpect(jsonPath("$[0].address").value("Leeds"))
                .andExpect(jsonPath("$[0].owner").doesNotExist());
    }

    @Test
    @WithMockUser
    void savesAPlace() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(service.add(ash, "Gym", 53.79, -1.54, null))
                .thenReturn(new SavedPlace(ash, "Gym", 53.79, -1.54, null));

        mockMvc.perform(post("/api/places")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gym\",\"latitude\":53.79,\"longitude\":-1.54}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Gym"));
    }

    @Test
    @WithMockUser
    void aNameAlreadyInUseIsAConflict() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(service.add(any(User.class), anyString(), anyDouble(), anyDouble(), isNull()))
                .thenThrow(new PlaceNameTakenException("Home"));

        mockMvc.perform(post("/api/places")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Home\",\"latitude\":53.8,\"longitude\":-1.55}"))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void aPlaceThatIsNotOnTheMapIsABadRequest() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(service.add(any(User.class), anyString(), anyDouble(), anyDouble(), isNull()))
                .thenThrow(new IllegalArgumentException("That isn't a real place on the map"));

        mockMvc.perform(post("/api/places")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Moon\",\"latitude\":200,\"longitude\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void changingSomeoneElsesPlaceIsNotFound() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        when(service.update(eq(ash), eq(99L), anyString(), anyDouble(), anyDouble(), isNull()))
                .thenThrow(new PlaceNotFoundException(99L));

        mockMvc.perform(put("/api/places/99")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Mine now\",\"latitude\":53.8,\"longitude\":-1.55}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void deletesAPlace() throws Exception {
        when(currentUser.get()).thenReturn(ash);

        mockMvc.perform(delete("/api/places/7").with(csrf()))
                .andExpect(status().isNoContent());

        verify(service).delete(ash, 7L);
    }

    @Test
    @WithMockUser
    void deletingSomeoneElsesPlaceIsNotFound() throws Exception {
        when(currentUser.get()).thenReturn(ash);
        doThrow(new PlaceNotFoundException(99L)).when(service).delete(ash, 99L);

        mockMvc.perform(delete("/api/places/99").with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void refusesAnyoneWhoIsNotSignedIn() throws Exception {
        mockMvc.perform(get("/api/places"))
                .andExpect(status().isUnauthorized());
    }
}
