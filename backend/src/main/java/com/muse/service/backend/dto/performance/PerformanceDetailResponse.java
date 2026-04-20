package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.Performance;
import java.time.LocalDateTime;
import java.util.List;

public record PerformanceDetailResponse(
        Integer performanceId,
        String title,
        int songCount,
        LocalDateTime createdAt,
        List<PerformanceSongResponse> songs
) {

    public static PerformanceDetailResponse from(Performance performance, List<PerformanceSongResponse> songs) {
        return new PerformanceDetailResponse(
                performance.getPerformanceId(),
                performance.getTitle(),
                songs.size(),
                performance.getCreatedAt(),
                songs
        );
    }
}
