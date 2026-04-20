package com.muse.service.backend.repository;

import com.muse.service.backend.entity.PerformanceSong;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PerformanceSongRepository extends JpaRepository<PerformanceSong, Integer> {

    @Query("""
            select ps
            from PerformanceSong ps
            where ps.performance.performanceId = :performanceId
              and ps.isDeleted = false
            order by ps.orderNo asc
            """)
    List<PerformanceSong> findAllActiveByPerformanceIdOrderByOrderNoAsc(@Param("performanceId") Integer performanceId);

    @Query("""
            select ps.performance.performanceId as performanceId, count(ps) as songCount
            from PerformanceSong ps
            where ps.performance.performanceId in :performanceIds
              and ps.isDeleted = false
            group by ps.performance.performanceId
            """)
    List<PerformanceSongCountProjection> countByPerformanceIds(@Param("performanceIds") Collection<Integer> performanceIds);

    Optional<PerformanceSong> findByPerformanceSongIdAndPerformance_PerformanceId(Integer performanceSongId, Integer performanceId);

    @Query("""
            select coalesce(max(ps.orderNo), 0)
            from PerformanceSong ps
            where ps.performance.performanceId = :performanceId
              and ps.isDeleted = false
            """)
    Integer findMaxOrderNoByPerformanceId(@Param("performanceId") Integer performanceId);

    List<PerformanceSong> findAllByPerformance_PerformanceIdAndIsDeletedFalseOrderByOrderNoAsc(Integer performanceId);

    interface PerformanceSongCountProjection {
        Integer getPerformanceId();

        long getSongCount();
    }
}
