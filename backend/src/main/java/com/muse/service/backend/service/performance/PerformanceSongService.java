package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceSongCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSongSessionsUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongStatusUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongUpdateRequest;

public interface PerformanceSongService {

    PerformanceSongDetailResponse create(Integer performanceId, Integer userId, PerformanceSongCreateRequest request);

    PerformanceSongDetailResponse getById(Integer performanceId, Integer performanceSongId);

    PerformanceSongDetailResponse update(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongUpdateRequest request
    );

    PerformanceSongDetailResponse updateStatus(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongStatusUpdateRequest request
    );

    PerformanceSongDetailResponse updateSessions(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongSessionsUpdateRequest request
    );

    void delete(Integer performanceId, Integer performanceSongId, Integer userId);
}
