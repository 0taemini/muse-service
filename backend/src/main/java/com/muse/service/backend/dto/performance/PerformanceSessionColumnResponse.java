package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSessionSource;

public record PerformanceSessionColumnResponse(
        Integer performanceSessionColumnId,
        Integer baseSessionTypeId,
        String sessionName,
        Boolean isRequired,
        Integer displayOrder,
        PerformanceSessionSource sessionSource
) {

    public static PerformanceSessionColumnResponse from(PerformanceSessionColumn column) {
        return new PerformanceSessionColumnResponse(
                column.getPerformanceSessionColumnId(),
                column.getBaseSessionType() == null ? null : column.getBaseSessionType().getSessionTypeId(),
                column.getSessionName(),
                column.getIsRequired(),
                column.getDisplayOrder(),
                column.getSessionSource()
        );
    }
}
