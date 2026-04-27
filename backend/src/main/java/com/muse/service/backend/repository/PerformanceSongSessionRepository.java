package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PerformanceSongSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceSongSessionRepository extends JpaRepository<PerformanceSongSession, Integer> {

    List<PerformanceSongSession> findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(Integer performanceSongId);

    Optional<PerformanceSongSession> findByPerformanceSongSessionIdAndPerformanceSong_PerformanceSongId(
            Integer performanceSongSessionId,
            Integer performanceSongId
    );

    Optional<PerformanceSongSession> findByPerformanceSong_PerformanceSongIdAndPerformanceSessionColumn_PerformanceSessionColumnId(
            Integer performanceSongId,
            Integer performanceSessionColumnId
    );

    List<PerformanceSongSession> findAllByPerformanceSessionColumn_PerformanceSessionColumnId(Integer performanceSessionColumnId);

    List<PerformanceSongSession> findAllByPerformanceSong_Performance_PerformanceIdAndAssignedUser_UserId(
            Integer performanceId,
            Integer userId
    );
}
