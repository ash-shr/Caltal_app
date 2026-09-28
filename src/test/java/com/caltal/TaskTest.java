package com.caltal;

import java.time.LocalDate;
import java.time.LocalTime;

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

    @Test
    void createsValidTimeBasedTask() {
        Task task = new Task("meeting", LocalDate.of(2026, 9, 21), owner, ReminderType.TIME,
                null, null, null, LocalTime.of(14, 30));

        assertEquals("meeting", task.getName());
        assertEquals(ReminderType.TIME, task.getReminderType());
        assertEquals(LocalTime.of(14, 30), task.getRemindAt());
    }

    @Test
    void createsValidBothTypeTask() {
        Task task = new Task("meeting at gym", LocalDate.of(2026, 9, 21), owner, ReminderType.BOTH,
                53.8100, -1.5600, 100, LocalTime.of(14, 30));

        assertEquals("meeting at gym", task.getName());
        assertEquals(ReminderType.BOTH, task.getReminderType());
        assertEquals(LocalTime.of(14, 30), task.getRemindAt());
    }

    @Test
    void rejectsLocationTaskWithMissingCoordinates() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Task("missing coords", LocalDate.of(2026, 9, 21), owner, ReminderType.LOCATION,
                    null, -1.5600, 100, null);
        });
    }

    @Test
    void rejectsTimeTaskWithMissingTime() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Task("missing time", LocalDate.of(2026, 9, 21), owner, ReminderType.TIME,
                    null, null, null, null);
        });
    }

    @Test
    void remindsAtTheTriggerPlaceWhenThereIsOne() {
        User owner = new User("test@example.com", "hash", "Test User");
        // The task is in Leeds city centre
        Task task = new Task("post a letter", 53.7960, -1.5450, 100,
                LocalDate.of(2026, 9, 21), owner);

        // But remind me near Headingley, which is on my way
        task.applyTrigger(53.8200, -1.5800, 300);

        // Standing at the task itself is now not what fires it
        assertFalse(task.isWithinRange(53.7960, -1.5450));

        // Standing at the trigger place does
        assertTrue(task.isWithinRange(53.8201, -1.5801));
    }

    @Test
    void remindsAtTheTaskPlaceWhenThereIsNoTrigger() {
        User owner = new User("test@example.com", "hash", "Test User");
        Task task = new Task("post a letter", 53.7960, -1.5450, 100,
                LocalDate.of(2026, 9, 21), owner);

        assertTrue(task.isWithinRange(53.7961, -1.5451));
    }

    @Test
    void rejectsAHalfFilledTriggerPlace() {
        User owner = new User("test@example.com", "hash", "Test User");
        Task task = new Task("post a letter", 53.7960, -1.5450, 100,
                LocalDate.of(2026, 9, 21), owner);

        assertThrows(IllegalArgumentException.class,
                () -> task.applyTrigger(53.8200, null, 300));
    }

    @Test
    void rejectsATriggerPlaceOnATimeOnlyTask() {
        User owner = new User("test@example.com", "hash", "Test User");
        Task task = new Task("ring the dentist", LocalDate.of(2026, 9, 21), owner,
                ReminderType.TIME, null, null, null, LocalTime.of(9, 0));

        assertThrows(IllegalArgumentException.class,
                () -> task.applyTrigger(53.8200, -1.5800, 300));
    }
}
