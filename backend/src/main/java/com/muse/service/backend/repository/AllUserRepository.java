package com.muse.service.backend.repository;

import com.muse.service.backend.entity.AllUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllUserRepository extends JpaRepository<AllUser, Integer> {
    Optional<AllUser> findByNameAndCohortAndPhoneAndStatus(
            String name,
            Integer cohort,
            String phone,
            AllUser.AllUserStatus status
    );
}
