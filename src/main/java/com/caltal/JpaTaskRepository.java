package com.caltal;

import java.util.List;
import java.util.Optional;

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

    @Override
    public Optional<Task> findByIdAndOwner(Long id, User owner) {
        return springDataRepository.findByIdAndOwner(id, owner);
    }

    @Override
    public void delete(Task task) {
        springDataRepository.delete(task);
    }

    @Override
    public void deleteAllByOwner(User owner) {
        springDataRepository.deleteAllByOwner(owner);
    }
}
