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
            if (!task.isComplete() && task.getLatitude() != null && task.isWithinRange(userLatitude, userLongitude)) {
                nearby.add(task);
            }
        }

        return nearby;
    }

    public Task completeTask(User owner, Long id) {
        Task task = findOwnedTask(owner, id);
        task.markComplete();
        repository.save(task);
        return task;
    }

    public Task updateTask(User owner, Long id, CreateTaskRequest details) {
        if (details == null) {
            throw new IllegalArgumentException("Details must not be null");
        }

        Task task = findOwnedTask(owner, id);

        task.update(
                details.getName(),
                details.getDueDate(),
                details.getReminderType(),
                details.getLatitude(),
                details.getLongitude(),
                details.getRadius(),
                details.getRemindAt());

        task.applyTrigger(
                details.getTriggerLatitude(),
                details.getTriggerLongitude(),
                details.getTriggerRadius());

        repository.save(task);
        return task;
    }

    public void deleteTask(User owner, Long id) {
        repository.delete(findOwnedTask(owner, id));
    }

    private Task findOwnedTask(User owner, Long id) {
        return repository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new TaskNotFoundException("No task with id " + id));
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