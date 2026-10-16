package com.caltal;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountTokenRepository extends JpaRepository<AccountToken, Long> {

    // Loads the user in the same query, so it can be used after the lookup
    // without a second trip to the database.
    @Query("select t from AccountToken t join fetch t.user "
            + "where t.tokenHash = :tokenHash and t.purpose = :purpose")
    Optional<AccountToken> findByTokenHashAndPurpose(
            @Param("tokenHash") String tokenHash,
            @Param("purpose") TokenPurpose purpose);

    long countByUserAndPurposeAndCreatedAtAfter(User user, TokenPurpose purpose, Instant since);

    // Uses one link, but only if nobody has used it yet. The check and the
    // change happen in one statement, so if the same link arrives twice at
    // once, exactly one of them gets 1 back and the other gets 0.
    @Modifying
    @Query("update AccountToken t set t.usedAt = :now where t.id = :id and t.usedAt is null")
    int markUsed(@Param("id") Long id, @Param("now") Instant now);

    // Once one link has done its job, any others of the same kind still sitting
    // in the person's inbox stop working too.
    @Modifying
    @Query("update AccountToken t set t.usedAt = :now "
            + "where t.user = :user and t.purpose = :purpose and t.usedAt is null")
    int markAllUsed(
            @Param("user") User user,
            @Param("purpose") TokenPurpose purpose,
            @Param("now") Instant now);

    // Tidying up. Old rows are only kept long enough to count recent emails.
    @Modifying
    @Query("delete from AccountToken t where t.expiresAt < :cutoff")
    int deleteAllExpiredBefore(@Param("cutoff") Instant cutoff);

    // Used when an account is deleted. Runs inside AccountService's transaction.
    @Modifying
    @Query("delete from AccountToken t where t.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
