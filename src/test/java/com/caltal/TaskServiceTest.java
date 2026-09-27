package com.caltal;

import java.time.LocalDate;
// import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TaskServiceTest {

    private final User owner = new User("test@example.com", "hash", "Test User");
    private final LocalDate today = LocalDate.of(2026, 9, 21);

    private TaskService newService() {
        return new TaskService(new InMemoryTaskRepository());
    }

    @Test
    void returnsOnlyTasksWithinRange() {
        TaskService service = newService();
        service.addTask(new Task("buy milk", 53.7960, -1.5450, 200, today, owner));
        service.addTask(new Task("gym", 53.8100, -1.5600, 100, today, owner));
        service.addTask(new Task("meeting", today, owner, ReminderType.TIME, null, null, null,
                java.time.LocalTime.of(14, 30)));

        List<Task> nearby = service.findNearbyTasks(owner, 53.7961, -1.5451);

        assertEquals(1, nearby.size());
        assertEquals("buy milk", nearby.get(0).getName());
    }

    @Test
    void excludesCompletedTasksFromResults() {
        TaskService service = newService();

        Task done = new Task("posted letter", 53.7960, -1.5450, 200, today, owner);
        done.markComplete();
        service.addTask(done);

        List<Task> nearby = service.findNearbyTasks(owner, 53.7961, -1.5451);

        assertTrue(nearby.isEmpty());
    }

    @Test
    void returnsEmptyListWhenNothingInRange() {
        TaskService service = newService();
        service.addTask(new Task("get laundry", 53.7960, -1.5450, 200, today, owner));

        List<Task> nearby = service.findNearbyTasks(owner, 51.5074, -0.1278);

        assertTrue(nearby.isEmpty());
    }

    @Test
    void returnsOnlyTasksOnGivenDate() {
        TaskService service = newService();
        service.addTask(new Task("today", 53.7960, -1.5450, 200,
                LocalDate.of(2026, 9, 20), owner));
        service.addTask(new Task("tomorrow", 53.7960, -1.5450, 200,
                LocalDate.of(2026, 9, 21), owner));

        List<Task> tasks = service.findTasksOnDate(owner, LocalDate.of(2026, 9, 20));

        assertEquals(1, tasks.size());
        assertEquals("today", tasks.get(0).getName());
    }

    @Test
    void doesNotReturnAnotherUsersTasks() {
        User other = new User("other@example.com", "hash", "Other User");

        TaskService service = newService();
        service.addTask(new Task("mine", 53.7960, -1.5450, 200, today, owner));
        service.addTask(new Task("theirs", 53.7960, -1.5450, 200, today, other));

        List<Task> tasks = service.getAllTasks(owner);

        assertEquals(1, tasks.size());
        assertEquals("mine", tasks.get(0).getName());
    }

    @Test
    void rejectsNullTask() {
        TaskService service = newService();

        assertThrows(IllegalArgumentException.class, () -> service.addTask(null));
    }

    @Test
    void returnedTaskListIsACopy() {
        TaskService service = newService();
        service.addTask(new Task("buy milk", 53.7960, -1.5450, 200, today, owner));

        service.getAllTasks(owner).clear();

        assertEquals(1, service.getAllTasks(owner).size());
    }

    @Test
    void completesATaskTheUserOwns() {
        TaskRepository repository = mock(TaskRepository.class);
        TaskService service = new TaskService(repository);
        Task task = new Task("water plants", 53.7960, -1.5450, 200, today, owner);

        when(repository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(task));

        Task completed = service.completeTask(owner, 1L);

        assertTrue(completed.isComplete());
        verify(repository).save(task);
    }

    @Test
    void refusesToCompleteATaskTheUserDoesNotOwn() {
        TaskRepository repository = mock(TaskRepository.class);
        TaskService service = new TaskService(repository);

        // Someone else's task, or no such task: the repository returns nothing either way
        when(repository.findByIdAndOwner(1L, owner)).thenReturn(Optional.empty());

        assertThrows(TaskNotFoundException.class, () -> service.completeTask(owner, 1L));
    }

    @Test
    void deletesATaskTheUserOwns() {
        TaskRepository repository = mock(TaskRepository.class);
        TaskService service = new TaskService(repository);
        Task task = new Task("cancel gym", 53.7960, -1.5450, 200, today, owner);

        when(repository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(task));

        service.deleteTask(owner, 1L);

        verify(repository).delete(task);
    }

    @Test
    void refusesToDeleteATaskTheUserDoesNotOwn() {
        TaskRepository repository = mock(TaskRepository.class);
        TaskService service = new TaskService(repository);

        when(repository.findByIdAndOwner(1L, owner)).thenReturn(Optional.empty());

        assertThrows(TaskNotFoundException.class, () -> service.deleteTask(owner, 1L));
    }

    @Test
    void aNewTaskStartsIncomplete() {
        Task task = new Task("new thing", 53.7960, -1.5450, 200, today, owner);

        assertFalse(task.isComplete());
    }
}
