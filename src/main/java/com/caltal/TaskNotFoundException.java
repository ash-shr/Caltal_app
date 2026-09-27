package com.caltal;

// Thrown when a task does not exist, or exists but belongs to someone else.
// Those two cases deliberately look identical from outside: telling a caller
// "that task exists but isn't yours" leaks the fact that it exists.
public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(String message) {
        super(message);
    }
}
