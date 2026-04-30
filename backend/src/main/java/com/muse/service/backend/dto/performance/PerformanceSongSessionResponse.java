package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.User;

public record PerformanceSongSessionResponse(
        Integer performanceSongSessionId,
        Integer performanceSessionColumnId,
        Integer baseSessionTypeId,
        String sessionName,
        Boolean isRequired,
        Integer displayOrder,
        Integer assignedUserId
) {

    public static PerformanceSongSessionResponse from(PerformanceSongSession session) {
        return new PerformanceSongSessionResponse(
                session.getPerformanceSongSessionId(),
                session.getPerformanceSessionColumn() == null
                        ? null
                        : session.getPerformanceSessionColumn().getPerformanceSessionColumnId(),
                session.getBaseSessionType() == null ? null : session.getBaseSessionType().getSessionTypeId(),
                session.getSessionName(),
                session.getIsRequired(),
                session.getDisplayOrder(),
                session.getAssignedUser() == null || session.getAssignedUser().getStatus() != User.UserStatus.ACTIVE
                        ? null
                        : session.getAssignedUser().getUserId()
        );
    }
}
