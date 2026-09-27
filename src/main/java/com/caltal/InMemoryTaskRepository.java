package com.caltal;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryTaskRepository implements TaskRepository {
    private final List<Task> tasks = new ArrayList<>();

    @Override
    public void save(Task task) {
        tasks.add(task);
    }

    @Override
    public List<Task> findAllByOwner(User owner) {
        List<Task> owned = new ArrayList<>();

        for (Task task : tasks) {
            if (task.getOwner().equals(owner)) {
                owned.add(task);
            }
        }

        return owned;
    }

    @Override
    public Optional<Task> findByIdAndOwner(Long id, User owner) {
        for (Task task : tasks) {
            if (Objects.equals(task.getId(), id) && task.getOwner().equals(owner)) {
                return Optional.of(task);
            }
        }

        return Optional.empty();
    }

    @Override
    public void delete(Task task) {
        tasks.remove(task);
    }
}
