package com.caltal;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Every lookup includes the owner. A place belonging to someone else must be
// invisible — never found and then refused.
public interface SavedPlaceRepository extends JpaRepository<SavedPlace, Long> {

    List<SavedPlace> findAllByOwnerOrderByNameAsc(User owner);

    Optional<SavedPlace> findByIdAndOwner(Long id, User owner);

    long countByOwner(User owner);

    boolean existsByOwnerAndNameKey(User owner, String nameKey);

    // The same check when renaming: does anything *else* already use the name?
    boolean existsByOwnerAndNameKeyAndIdNot(User owner, String nameKey, Long id);

    // Used when an account is deleted. Runs inside AccountService's transaction.
    @Modifying
    @Query("delete from SavedPlace p where p.owner = :owner")
    void deleteAllByOwner(@Param("owner") User owner);
}
