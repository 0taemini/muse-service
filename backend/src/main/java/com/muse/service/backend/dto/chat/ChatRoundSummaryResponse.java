package com.muse.service.backend.dto.chat;

import com.muse.service.backend.entity.ChatRound;
import java.time.LocalDateTime;

public record ChatRoundSummaryResponse(
        Integer chatRoundId,
        ChatRound.RoundStatus status,
        LocalDateTime openedAt,
        LocalDateTime closedAt
) {

    public static ChatRoundSummaryResponse from(ChatRound chatRound) {
        return new ChatRoundSummaryResponse(
                chatRound.getChatRoundId(),
                chatRound.getStatus(),
                chatRound.getOpenedAt(),
                chatRound.getClosedAt()
        );
    }
}
