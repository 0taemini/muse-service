package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PerformanceSessionColumn;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerformanceSessionColumnRepository extends JpaRepository<PerformanceSessionColumn, Integer> {

    List<PerformanceSessionColumn> findAllByPerformance_PerformanceIdOrderByDisplayOrderAsc(Integer performanceId);

    Optional<PerformanceSessionColumn> findByPerformanceSessionColumnIdAndPerformance_PerformanceId(
            Integer performanceSessionColumnId,
            Integer performanceId
    );

    boolean existsByPerformance_PerformanceIdAndSessionNameIgnoreCase(Integer performanceId, String sessionName);

    boolean existsByPerformance_PerformanceIdAndSessionNameIgnoreCaseAndPerformanceSessionColumnIdNot(
            Integer performanceId,
            String sessionName,
            Integer performanceSessionColumnId
    );
}
