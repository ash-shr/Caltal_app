package com.caltal;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaskServiceTest {
    class FakeTaskRepository implements TaskRepository {

        private final List<Task> tasks = new ArrayList<>();
        private int saveCallCount = 0;

        @Override
        public void save(Task task) {
            saveCallCount++;
            tasks.add(task);
        }

        @Override
        public List<Task> findAll() {
            return new ArrayList<>(tasks);
        }

        public int getSaveCallCount() {
            return saveCallCount;
        }
    }

    @Test
    void returnsOnlyTasksOnGivenDate() {
        TaskService service = new TaskService(new InMemoryTaskRepository());
        service.addTask(new Task("today", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20)));
        service.addTask(new Task("tomorrow", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 21)));

        List<Task> tasks = service.findTasksOnDate(LocalDate.of(2026, 9, 20));

        assertEquals(1, tasks.size());
        assertEquals("today", tasks.get(0).getName());
    }

    @Test
    void savesTaskToRepository() {
        FakeTaskRepository fake = new FakeTaskRepository();
        TaskService service = new TaskService(fake);

        service.addTask(new Task("byu milk", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20)));
        assertEquals(1, fake.getSaveCallCount());
    }

    @Test
    void doesNotSaveNullTask() {
        FakeTaskRepository fake = new FakeTaskRepository();
        TaskService service = new TaskService(fake);

        assertThrows(IllegalArgumentException.class, () -> service.addTask(null));
        assertEquals(0, fake.getSaveCallCount());
    }

    @Test
    void returnsOnlyTasksWithinRange() {
        TaskService service = new TaskService(new InMemoryTaskRepository());
        service.addTask(new Task("buy milk", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20)));
        service.addTask(new Task("gym", 53.8100, -1.5600, 100, LocalDate.of(2026, 9, 20)));

        List<Task> nearby = service.findNearbyTasks(53.7961, -1.5451);

        assertEquals(1, nearby.size());
        assertEquals("buy milk", nearby.get(0).getName());
    }

    @Test
    void excludesCompletedTasksFromResults() {
        TaskService service = new TaskService(new InMemoryTaskRepository());

        Task done = new Task("posted letter", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20));
        done.markComplete();
        service.addTask(done);

        List<Task> nearby = service.findNearbyTasks(53.7961, -1.5451);

        assertTrue(nearby.isEmpty());
    }

    @Test
    void returnsEmptyListWhenNothingInRange() {
        TaskService service = new TaskService(new InMemoryTaskRepository());
        service.addTask(new Task("get laundry", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20)));

        List<Task> nearby = service.findNearbyTasks(51.5074, -0.1278);

        assertTrue(nearby.isEmpty());
    }

    @Test
    void rejectsNullTask() {
        TaskService service = new TaskService(new InMemoryTaskRepository());

        assertThrows(IllegalArgumentException.class, () -> service.addTask(null));
    }

    @Test
    void returnedTaskListIsACopy() {
        TaskService service = new TaskService(new InMemoryTaskRepository());
        service.addTask(new Task("buy milk", 53.7960, -1.5450, 200, LocalDate.of(2026, 9, 20)));

        service.getAllTasks().clear();

        assertEquals(1, service.getAllTasks().size());
    }
}