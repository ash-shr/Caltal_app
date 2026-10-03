package com.caltal;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest
class JpaTaskRepositoryTest {

    @Autowired
    private SpringDataTaskRepository tasks;

    @Autowired
    private UserRepository users;

    @Test
    void savesTaskAndAssignsId() {
        User owner = users.save(new User("test@example.com", "hash", "Test User"));

        Task task = new Task("buy milk", 53.796, -1.545, 200,
                LocalDate.of(2026, 9, 21), owner);

        Task saved = tasks.save(task);

        assertNotNull(saved.getId());
        assertEquals(1, tasks.findAllByOwner(owner).size());
    }

    @Test
    void deletesEveryTaskOfOneOwnerAndNoOneElses() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        LocalDate day = LocalDate.of(2026, 10, 2);
        tasks.save(new Task("buy milk", 53.796, -1.545, 200, day, ash));
        tasks.save(new Task("gym", 53.810, -1.560, 100, day, ash));
        tasks.save(new Task("post office", 53.800, -1.550, 150, day, sam));

        tasks.deleteAllByOwner(ash);

        assertEquals(0, tasks.findAllByOwner(ash).size());
        assertEquals(1, tasks.findAllByOwner(sam).size());
    }
}
