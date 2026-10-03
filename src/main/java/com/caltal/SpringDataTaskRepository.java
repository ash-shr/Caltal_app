package com.caltal;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataTaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByOwner(User owner);

    Optional<Task> findByIdAndOwner(Long id, User owner);

    // One DELETE statement, rather than loading every task just to remove it.
    // @Modifying queries must run inside a transaction; AccountService provides it.
    @Modifying
    @Query("delete from Task t where t.owner = :owner")
    void deleteAllByOwner(@Param("owner") User owner);
}