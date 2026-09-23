package com.caltal;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;
    private final CurrentUserService currentUser;

    public TaskController(TaskService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return service.getAllTasks(currentUser.get());
    }

    @GetMapping("/on")
    public List<Task> getTasksOnDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.findTasksOnDate(currentUser.get(), date);
    }

    @GetMapping("/nearby")
    public List<Task> getNearbyTasks(
            @RequestParam double lat,
            @RequestParam double lon) {
        return service.findNearbyTasks(currentUser.get(), lat, lon);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task createTask(@RequestBody CreateTaskRequest request) {
        Task task = new Task(
                request.getName(),
                request.getLatitude(),
                request.getLongitude(),
                request.getRadius(),
                request.getDueDate(),
                currentUser.get());

        service.addTask(task);
        return task;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalidTask(IllegalArgumentException exception) {
        return exception.getMessage();
    }
}