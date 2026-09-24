package com.caltal;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class TaskService {

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        if (repository == null) {
            throw new IllegalArgumentException("Repository must not be null");
        }
        this.repository = repository;
    }

    public void addTask(Task task) {
        if (task == null) {
            throw new IllegalArgumentException("Task must not be null");
        }
        repository.save(task);
    }

    public List<Task> getAllTasks(User owner) {
        return repository.findAllByOwner(owner);
    }

    public List<Task> findNearbyTasks(User owner, double userLatitude, double userLongitude) {
        List<Task> nearby = new ArrayList<>();

        for (Task task : repository.findAllByOwner(owner)) {
            if (!task.isComplete() && task.isWithinRange(userLatitude, userLongitude)) {
                nearby.add(task);
            }
        }

        return nearby;
    }

    public List<Task> findTasksOnDate(User owner, LocalDate date) {
        List<Task> onDate = new ArrayList<>();

        for (Task task : repository.findAllByOwner(owner)) {
            if (task.getDueDate().equals(date)) {
                onDate.add(task);
            }
        }

        return onDate;
    }
}