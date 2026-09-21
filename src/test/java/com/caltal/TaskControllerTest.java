package com.caltal;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

    @Test
    void returnsNearbyTasksAsJson() throws Exception {
        Task task = new Task("buy milk", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20));
        when(service.findNearbyTasks(anyDouble(), anyDouble())).thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks/nearby?lat=53.7961&lon=-1.5451"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("buy milk"));
    }

    @Test
    void returnsAllTasksAsJson() throws Exception {
        Task milk = new Task("buy milk", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20));
        Task gym = new Task("gym", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 20));
        when(service.getAllTasks()).thenReturn(List.of(milk, gym));

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void createsTaskFromPostRequest() throws Exception {
        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"buy milk\",\"latitude\":53.796,\"longitude\":-1.545,\"radius\":200,\"dueDate\":\"2026-09-20\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("buy milk"));

        verify(service).addTask(any(Task.class));
    }

    @Test
    void rejectsTaskWithInvalidLatitude() throws Exception {
        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"impossible\",\"latitude\":9999,\"longitude\":0,\"radius\":200}"))
                .andExpect(status().isBadRequest());
    }
}