package com.caltal;

import java.util.List;

public interface TaskRepository {

    void save(Task task);

    List<Task> findAllByOwner(User owner);
}