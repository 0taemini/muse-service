package com.muse.service.backend.dto.chat;

import com.muse.service.backend.dto.performance.PerformanceSongSessionResponse;
import java.time.LocalDateTime;
import java.util.List;

public record ChatRoomDetailResponse(
        ChatRoomSummaryResponse room,
        List<PerformanceSongSessionResponse> sessions,
        List<ChatMessageResponse> messages,
        Boolean canStartNewRound,
        LocalDateTime nextRoundAvailableAt,
        Boolean currentRoundSummarized
) {
}
