package com.muse.service.backend.dto.chat;

import com.muse.service.backend.entity.Message;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.entity.User;
import java.time.LocalDateTime;

public record ChatMessageResponse(
        Integer messageId,
        Integer chatRoomId,
        Integer chatRoundId,
        Integer senderUserId,
        String senderName,
        String senderNickname,
        Integer targetPerformanceSongSessionId,
        String targetSessionName,
        Integer targetUserId,
        String targetUserName,
        Integer senderRepresentativeSessionTypeId,
        String senderRepresentativeSessionName,
        String content,
        LocalDateTime createdAt
) {

    public static ChatMessageResponse from(Message message) {
        User sender = message.getSenderUser();
        PerformanceSongSession targetSession = message.getTargetPerformanceSongSession();
        User targetUser = targetSession.getAssignedUser();
        SessionType representativeSessionType = message.getSenderRepresentativeSessionType();

        return new ChatMessageResponse(
                message.getMessageId(),
                message.getChatRound().getChatRoom().getChatRoomId(),
                message.getChatRound().getChatRoundId(),
                sender.getUserId(),
                sender.getName(),
                sender.getNickname(),
                targetSession.getPerformanceSongSessionId(),
                targetSession.getSessionName(),
                targetUser == null ? null : targetUser.getUserId(),
                targetUser == null ? null : targetUser.getName(),
                representativeSessionType == null ? null : representativeSessionType.getSessionTypeId(),
                message.getSenderRepresentativeSessionName(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
