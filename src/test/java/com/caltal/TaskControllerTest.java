package com.caltal;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService service;

    @MockitoBean
    private CurrentUserService currentUser;

    @MockitoBean
    private JwtService jwtService;

    private final User owner = new User("test@example.com", "hash", "Test User");
    private final LocalDate today = LocalDate.of(2026, 9, 21);

    @Test
    @WithMockUser
    void returnsNearbyTasksAsJson() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        Task task = new Task("buy milk", 53.7960, -1.5450, 200, today, owner);
        when(service.findNearbyTasks(any(User.class), anyDouble(), anyDouble()))
                .thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks/nearby?lat=53.7961&lon=-1.5451"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("buy milk"));
    }

    @Test
    @WithMockUser
    void returnsAllTasksAsJson() throws Exception {
        when(currentUser.get()).thenReturn(owner);
        Task milk = new Task("buy milk", 53.7960, -1.5450, 200, today, owner);
        Task gym = new Task("gym", 53.8100, -1.5600, 100, today, owner);
        when(service.getAllTasks(any(User.class))).thenReturn(List.of(milk, gym));

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser
    void createsTaskFromPostRequest() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"buy milk\",\"reminderType\":\"LOCATION\","
                        + "\"latitude\":53.796,\"longitude\":-1.545,"
                        + "\"radius\":200,\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("buy milk"));

        verify(service).addTask(any(Task.class));
    }

    @Test
    @WithMockUser
    void rejectsTaskWithInvalidLatitude() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"impossible\",\"reminderType\":\"LOCATION\","
                        + "\"latitude\":9999,\"longitude\":0,"
                        + "\"radius\":200,\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createsTimeBasedTask() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"meeting\",\"reminderType\":\"TIME\","
                        + "\"remindAt\":\"14:30\",\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("meeting"));

        verify(service).addTask(any(Task.class));
    }

    @Test
    @WithMockUser
    void createsBothTypeTask() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"gym meeting\",\"reminderType\":\"BOTH\","
                        + "\"latitude\":53.81,\"longitude\":-1.56,\"radius\":100,"
                        + "\"remindAt\":\"14:30\",\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("gym meeting"));

        verify(service).addTask(any(Task.class));
    }

    @Test
    @WithMockUser
    void rejectsLocationTaskWithoutCoordinates() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"no coords\",\"reminderType\":\"LOCATION\","
                        + "\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void rejectsTimeTaskWithoutTime() throws Exception {
        when(currentUser.get()).thenReturn(owner);

        mockMvc.perform(post("/api/tasks")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"no time\",\"reminderType\":\"TIME\","
                        + "\"dueDate\":\"2026-09-21\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized());
    }
}