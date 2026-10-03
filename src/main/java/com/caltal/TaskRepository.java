package com.caltal;

import java.util.List;
import java.util.Optional;

public interface TaskRepository {

    void save(Task task);

    List<Task> findAllByOwner(User owner);

    // Owner is part of the lookup, not a check afterwards: a task belonging to
    // someone else must be invisible, never merely rejected.
    Optional<Task> findByIdAndOwner(Long id, User owner);

    void delete(Task task);

    // Used when an account is deleted: its tasks go with it.
    void deleteAllByOwner(User owner);
}