package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PerformanceMember;
import com.muse.service.backend.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceMemberRepository extends JpaRepository<PerformanceMember, Integer> {

    List<PerformanceMember> findAllByPerformance_PerformanceIdOrderByCreatedAtAsc(Integer performanceId);

    List<PerformanceMember> findAllByPerformance_PerformanceIdAndUser_StatusOrderByCreatedAtAsc(
            Integer performanceId,
            User.UserStatus status
    );

    Optional<PerformanceMember> findByPerformance_PerformanceIdAndUser_UserId(Integer performanceId, Integer userId);

    boolean existsByPerformance_PerformanceIdAndUser_UserId(Integer performanceId, Integer userId);

    boolean existsByPerformance_PerformanceIdAndUser_UserIdAndUser_Status(
            Integer performanceId,
            Integer userId,
            User.UserStatus status
    );
}
