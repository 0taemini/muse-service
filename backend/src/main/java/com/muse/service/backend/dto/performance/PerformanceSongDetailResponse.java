package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSong;
import java.util.List;

public record PerformanceSongDetailResponse(
        Integer performanceSongId,
        Integer performanceId,
        String songTitle,
        String singer,
        Boolean isSheet,
        Integer orderNo,
        PerformanceSong.SelectionStatus selectionStatus,
        Integer createdByUserId,
        Boolean chatRoomCreated,
        List<PerformanceSongSessionResponse> sessions
) {

    public static PerformanceSongDetailResponse from(
            PerformanceSong performanceSong,
            boolean chatRoomCreated,
            List<PerformanceSongSessionResponse> sessions
    ) {
        return new PerformanceSongDetailResponse(
                performanceSong.getPerformanceSongId(),
                performanceSong.getPerformance().getPerformanceId(),
                performanceSong.getSongTitle(),
                performanceSong.getSinger(),
                performanceSong.getIsSheet(),
                performanceSong.getOrderNo(),
                performanceSong.getSelectionStatus(),
                performanceSong.getCreatedByUser() == null ? null : performanceSong.getCreatedByUser().getUserId(),
                chatRoomCreated,
                sessions
        );
    }
}
