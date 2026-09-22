package com.muse.service.backend.repository;

import com.muse.service.backend.entity.Performance;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface PerformanceRepository extends JpaRepository<Performance, Integer> {

    List<Performance> findAllByOrderByCreatedAtDesc();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Performance p
            set p.songOrderVersion = p.songOrderVersion + 1
            where p.performanceId = :performanceId
              and p.songOrderVersion = :expectedVersion
            """)
    int increaseSongOrderVersion(
            @Param("performanceId") Integer performanceId,
            @Param("expectedVersion") Long expectedVersion
    );
}
