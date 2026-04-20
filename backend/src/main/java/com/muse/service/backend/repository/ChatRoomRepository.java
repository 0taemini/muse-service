package com.muse.service.backend.repository;

import com.muse.service.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Integer> {

    boolean existsByPerformanceSong_PerformanceSongId(Integer performanceSongId);

    boolean existsByPerformanceSong_Performance_PerformanceIdAndPerformanceSong_IsDeletedFalse(Integer performanceId);
}
