package com.caltal;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaskTest {

    private final User owner = new User("test@example.com", "hash", "Test User");

    @Test
    void createsTaskWithValidValues() {
        Task task = new Task("buy milk", 53.8008, -1.5491, 200,
                LocalDate.of(2026, 9, 21), owner);

        assertEquals("buy milk", task.getName());
        assertEquals(200, task.getRadius());
    }

    @Test
    void rejectsLatitudeAboveNinety() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Task("impossible", 9999, 0, 200, LocalDate.of(2026, 9, 21), owner);
        });
    }

    @Test
    void marksTaskComplete() {
        Task task = new Task("gym", 53.8100, -1.5600, 100,
                LocalDate.of(2026, 9, 21), owner);
        task.markComplete();

        assertTrue(task.isComplete());
    }

    @Test
    void returnsTrueWhenUserIsInsideGeofence() {
        Task task = new Task("gym", 53.8100, -1.5600, 100,
                LocalDate.of(2026, 9, 21), owner);

        assertTrue(task.isWithinRange(53.8101, -1.5600));
    }

    @Test
    void returnsFalseWhenUserIsOutsideGeofence() {
        Task task = new Task("gym", 53.8100, -1.5600, 100,
                LocalDate.of(2026, 9, 21), owner);

        assertFalse(task.isWithinRange(53.900, -1.5600));
    }

    @Test
    void rejectsTaskWithoutOwner() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Task("orphan", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 21), null);
        });
    }
}