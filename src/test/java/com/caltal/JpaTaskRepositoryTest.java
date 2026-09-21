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
    private SpringDataTaskRepository repository;

    @Test
    void savesTaskAndAssignsId() {
        Task task = new Task("buy milk", 53.796, -1.545, 200, LocalDate.of(2026, 9, 21));

        Task saved = repository.save(task);

        assertNotNull(saved.getId());
        assertEquals(1, repository.findAll().size());
    }
}