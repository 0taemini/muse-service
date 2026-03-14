package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.Performance;
import java.time.LocalDateTime;

public record PerformanceSummaryResponse(
        Integer performanceId,
        String title,
        long songCount,
        LocalDateTime createdAt
) {

    public static PerformanceSummaryResponse from(Performance performance, long songCount) {
        return new PerformanceSummaryResponse(
                performance.getPerformanceId(),
                performance.getTitle(),
                songCount,
                performance.getCreatedAt()
        );
    }
}
