package com.caltal;

import java.util.ArrayList;
import java.util.List;
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
}
