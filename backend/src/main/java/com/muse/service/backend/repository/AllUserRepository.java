package com.muse.service.backend.repository;

import com.muse.service.backend.entity.AllUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface AllUserRepository extends JpaRepository<AllUser, Integer> {
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndAllUserIdNot(String email, Integer allUserId);

    boolean existsByNameAndCohortAndPhone(String name, Integer cohort, String phone);

    @Query("""
            select a from AllUser a
            where a.name = :name
              and a.cohort = :cohort
              and function('replace', a.phone, '-', '') = :normalizedPhone
              and a.status = :status
            """)
    Optional<AllUser> findRegisteredByNameAndCohortAndPhone(
            @Param("name") String name,
            @Param("cohort") Integer cohort,
            @Param("normalizedPhone") String normalizedPhone,
            @Param("status") AllUser.AllUserStatus status
    );
}
