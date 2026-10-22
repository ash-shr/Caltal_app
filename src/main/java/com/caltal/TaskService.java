package com.caltal;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TaskService {

    // Far more than anyone keeps by hand (a task a day for over ten years), so
    // it only stops a script filling the database, or the task list growing
    // too big for a phone to load. Finished tasks count, so the message says
    // what to do about it.
    static final int MAX_TASKS_PER_ACCOUNT = 5_000;

    private final TaskRepository repository;
    private final int maxTasks;

    @Autowired
    public TaskService(TaskRepository repository) {
        this(repository, MAX_TASKS_PER_ACCOUNT);
    }

    // Lets tests use a small limit
    TaskService(TaskRepository repository, int maxTasks) {
        if (repository == null) {
            throw new IllegalArgumentException("Repository must not be null");
        }
        this.repository = repository;
        this.maxTasks = maxTasks;
    }

    public void addTask(Task task) {
        if (task == null) {
            throw new IllegalArgumentException("Task must not be null");
        }
        if (repository.countByOwner(task.getOwner()) >= maxTasks) {
            throw new IllegalArgumentException(String.format(
                    "You've reached the limit of %,d tasks. Delete some finished ones to add more.",
                    maxTasks));
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