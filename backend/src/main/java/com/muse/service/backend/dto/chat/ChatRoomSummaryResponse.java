package com.muse.service.backend.dto.chat;

import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.ChatRound;
import com.muse.service.backend.entity.PerformanceSong;

public record ChatRoomSummaryResponse(
        Integer chatRoomId,
        Integer performanceId,
        Integer performanceSongId,
        String songTitle,
        String singer,
        Integer orderNo,
        PerformanceSong.SelectionStatus selectionStatus,
        ChatRoundSummaryResponse currentRound
) {

    public static ChatRoomSummaryResponse from(ChatRoom chatRoom, ChatRound currentRound) {
        PerformanceSong performanceSong = chatRoom.getPerformanceSong();
        return new ChatRoomSummaryResponse(
                chatRoom.getChatRoomId(),
                performanceSong.getPerformance().getPerformanceId(),
                performanceSong.getPerformanceSongId(),
                performanceSong.getSongTitle(),
                performanceSong.getSinger(),
                performanceSong.getOrderNo(),
                performanceSong.getSelectionStatus(),
                currentRound == null ? null : ChatRoundSummaryResponse.from(currentRound)
        );
    }
}
