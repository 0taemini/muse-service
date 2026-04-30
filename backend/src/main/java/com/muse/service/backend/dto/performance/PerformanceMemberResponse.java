package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceMember;

public record PerformanceMemberResponse(
        Integer userId,
        String name,
        Integer cohort,
        String nickname
) {

    public static PerformanceMemberResponse from(PerformanceMember performanceMember) {
        return new PerformanceMemberResponse(
                performanceMember.getUser().getUserId(),
                performanceMember.getUser().getName(),
                performanceMember.getUser().getCohort(),
                performanceMember.getUser().getNickname()
        );
    }
}
