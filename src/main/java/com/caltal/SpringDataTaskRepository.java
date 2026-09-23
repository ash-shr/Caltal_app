package com.caltal;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataTaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByOwner(User owner);
}