package com.caltal;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailCodeRepository extends JpaRepository<EmailCode, Long> {

    // The code most recently sent to this person that hasn't been used or
    // replaced. Only the newest one ever works.
    Optional<EmailCode> findFirstByUserAndUsedAtIsNullOrderByCreatedAtDesc(User user);

    long countByUserAndCreatedAtAfter(User user, Instant since);

    // A new code replaces any earlier ones still waiting
    @Modifying
    @Query("update EmailCode c set c.usedAt = :now where c.user = :user and c.usedAt is null")
    int markAllUsed(@Param("user") User user, @Param("now") Instant now);

    // Tidying up. Old rows are only kept long enough to count recent emails.
    @Modifying
    @Query("delete from EmailCode c where c.expiresAt < :cutoff")
    int deleteAllExpiredBefore(@Param("cutoff") Instant cutoff);

    // Used when an account is deleted. Runs inside AccountService's transaction.
    @Modifying
    @Query("delete from EmailCode c where c.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
