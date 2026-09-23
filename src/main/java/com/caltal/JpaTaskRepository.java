package com.caltal;

import java.util.List;

import org.springframework.stereotype.Repository;
import org.springframework.context.annotation.Primary;

@Repository
@Primary
public class JpaTaskRepository implements TaskRepository {
    private final SpringDataTaskRepository springDataRepository;

    public JpaTaskRepository(SpringDataTaskRepository springDataRepository) {
        this.springDataRepository = springDataRepository;
    }

    @Override
    public void save(Task task) {
        springDataRepository.save(task);

    }

    @Override
    public List<Task> findAllByOwner(User owner) {
        return springDataRepository.findAllByOwner(owner);
    }
}
