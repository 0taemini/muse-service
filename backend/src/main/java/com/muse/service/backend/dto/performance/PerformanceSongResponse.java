package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSong;

public record PerformanceSongResponse(
        Integer performanceSongId,
        String songTitle,
        String singer,
        Boolean isSheet,
        Integer orderNo,
        PerformanceSong.SelectionStatus selectionStatus
) {

    public static PerformanceSongResponse from(PerformanceSong performanceSong) {
        return new PerformanceSongResponse(
                performanceSong.getPerformanceSongId(),
                performanceSong.getSongTitle(),
                performanceSong.getSinger(),
                performanceSong.getIsSheet(),
                performanceSong.getOrderNo(),
                performanceSong.getSelectionStatus()
        );
    }
}
