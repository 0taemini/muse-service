package com.muse.service.backend.dto.chat;

import com.muse.service.backend.entity.FeedbackSummary;
import java.time.LocalDateTime;

public record FeedbackSummaryResponse(
        Integer summaryId,
        Integer chatRoundId,
        Integer performanceSongSessionId,
        String sessionName,
        Integer targetUserId,
        String targetUserName,
        String summaryText,
        Integer createdByUserId,
        LocalDateTime createdAt
) {

    public static FeedbackSummaryResponse from(FeedbackSummary summary) {
        return new FeedbackSummaryResponse(
                summary.getSummaryId(),
                summary.getChatRound().getChatRoundId(),
                summary.getPerformanceSongSession().getPerformanceSongSessionId(),
                summary.getPerformanceSongSession().getSessionName(),
                summary.getTargetUser() == null ? null : summary.getTargetUser().getUserId(),
                summary.getTargetUser() == null ? null : summary.getTargetUser().getName(),
                summary.getSummaryText(),
                summary.getCreatedBy().getUserId(),
                summary.getCreatedAt()
        );
    }
}
