package com.caltal;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;

// import java.util.ArrayList;
// import java.util.List;

class TaskTest {

    @Test
    void createsTaskWithValidValues() {
        Task task = new Task("buy milk", 53.8008, -1.5491, 200, LocalDate.of(2026, 9, 20));

        assertEquals("buy milk", task.getName());
        assertEquals(200, task.getRadius());
    }

    @Test
    void rejectsLatitudeAboveNinety() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Task("impossible", 9999, 0, 200, LocalDate.of(2026, 9, 20));
        });
    }

    @Test
    void marksTaskComplete() {
        Task task = new Task("gym", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 20));
        task.markComplete();

        assertTrue(task.isComplete());
    }

    @Test
    void returnsTrueWhenUserIsInsideGeofence() {
        Task task = new Task("gym", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 20));
        boolean result = task.isWithinRange(53.8101, -1.5600);
        assertTrue(result);
    }

    @Test
    void returnsFalseWhenUserIsOutsideGeofence() {
        Task task = new Task("gym", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 20));
        boolean result = task.isWithinRange(53.900, -1.5600);
        assertFalse(result);
    }

    // @Test
    // void returnsOnlyTasksWithinRange() {
    //     List<Task> tasks = new ArrayList<>();

    //     tasks.add(new Task("buy milk", 53.7960, -1.5450, 200));
    //     tasks.add(new Task("gym", 53.8100, -1.5600, 100));
    //     tasks.add(new Task("dentist", 53.7990, -1.5480, 150));

    //     List<Task> nearby = App.findNearbyTasks(tasks, 53.7961, -1.5451);

    //     assertEquals(1, nearby.size());
    //     assertEquals("buy milk", nearby.get(0).getName());
    // }

    // @Test
    // void excludesCompletedTasksFromResults() {
    //     List<Task> tasks = new ArrayList<>();

    //     Task done = new Task("posted letter", 53.7960, -1.5450, 200);
    //     done.markComplete();
    //     tasks.add(done);

    //     List<Task> nearby = App.findNearbyTasks(tasks, 53.7961, -1.5451);

    //     assertTrue(nearby.isEmpty());
    // }

    // @Test 
    // void returnsEmptyListWhenNothingInRange(){
    //     List<Task> tasks = new ArrayList<>();
    //     tasks.add(new Task("get laundry", 53.7960, -1.5450, 200));
    //     List<Task> nearby = App.findNearbyTasks(tasks, 51.5074, 0.1278);
    //     assertTrue(nearby.isEmpty());

    // }
}