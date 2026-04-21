package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.PerformanceSong;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Integer> {

    boolean existsByPerformanceSong_PerformanceSongId(Integer performanceSongId);

    boolean existsByPerformanceSong_Performance_PerformanceIdAndPerformanceSong_IsDeletedFalse(Integer performanceId);

    @Query("""
            select cr
            from ChatRoom cr
            join fetch cr.performanceSong ps
            join fetch ps.performance p
            where p.performanceId = :performanceId
              and ps.isDeleted = false
              and ps.selectionStatus = :selectionStatus
            order by ps.orderNo asc
            """)
    List<ChatRoom> findVisibleByPerformanceId(
            @Param("performanceId") Integer performanceId,
            @Param("selectionStatus") PerformanceSong.SelectionStatus selectionStatus
    );
}
