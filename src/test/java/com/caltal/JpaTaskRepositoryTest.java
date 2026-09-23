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
}