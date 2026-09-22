package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.Performance;
import java.time.LocalDateTime;
import java.util.List;

public record PerformanceDetailResponse(
        Integer performanceId,
        String title,
        Performance.PerformanceStatus status,
        Long songOrderVersion,
        int songCount,
        LocalDateTime createdAt,
        List<PerformanceSongResponse> songs,
        List<PerformanceMemberResponse> members
) {

    public static PerformanceDetailResponse from(
            Performance performance,
            List<PerformanceSongResponse> songs,
            List<PerformanceMemberResponse> members
    ) {
        return new PerformanceDetailResponse(
                performance.getPerformanceId(),
                performance.getTitle(),
                performance.getStatus(),
                performance.getSongOrderVersion(),
                songs.size(),
                performance.getCreatedAt(),
                songs,
                members
        );
    }
}
