package com.caltal;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataTaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByOwner(User owner);

    Optional<Task> findByIdAndOwner(Long id, User owner);
}