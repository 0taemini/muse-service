package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatMessageResponse;
import com.muse.service.backend.dto.chat.ChatMessageSendRequest;
import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.ChatRound;
import com.muse.service.backend.entity.Message;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.ChatRoundRepository;
import com.muse.service.backend.repository.MessageRepository;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageServiceImpl implements ChatMessageService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoundRepository chatRoundRepository;
    private final MessageRepository messageRepository;
    private final PerformanceMemberRepository performanceMemberRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Integer chatRoomId, Integer userId, ChatMessageSendRequest request) {
        User sender = findUser(userId);
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
        PerformanceSong performanceSong = chatRoom.getPerformanceSong();
        Integer performanceId = performanceSong.getPerformance().getPerformanceId();

        ensurePerformanceMember(performanceId, userId);
        ensureVisibleRoom(performanceSong);

        ChatRound currentRound = chatRoundRepository
                .findFirstByChatRoom_ChatRoomIdAndStatusOrderByOpenedAtDesc(chatRoomId, ChatRound.RoundStatus.OPEN)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROUND_NOT_OPEN));
        PerformanceSongSession targetSession = performanceSongSessionRepository
                .findByPerformanceSongSessionIdAndPerformanceSong_PerformanceSongId(
                        request.targetPerformanceSongSessionId(),
                        performanceSong.getPerformanceSongId()
                )
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_SONG_SESSION_NOT_FOUND));
        if (targetSession.getAssignedUser() == null) {
            throw new CustomException(ErrorCode.CHAT_TARGET_SESSION_NOT_ASSIGNED);
        }

        String content = request.content() == null ? "" : request.content().trim();
        if (content.isBlank()) {
            throw new CustomException(ErrorCode.CHAT_MESSAGE_EMPTY);
        }

        SessionType representativeSessionType = sender.getRepresentativeSessionType();
        Message message = messageRepository.save(
                Message.builder()
                        .chatRound(currentRound)
                        .senderUser(sender)
                        .targetPerformanceSongSession(targetSession)
                        .senderRepresentativeSessionType(representativeSessionType)
                        .senderRepresentativeSessionName(
                                representativeSessionType == null ? null : representativeSessionType.getDisplayName()
                        )
                        .content(content)
                        .build()
        );
        log.info("채팅 메시지 저장 완료: chatRoomId={}, chatRoundId={}, messageId={}, senderUserId={}, targetSessionId={}",
                chatRoomId,
                currentRound.getChatRoundId(),
                message.getMessageId(),
                userId,
                targetSession.getPerformanceSongSessionId());
        return ChatMessageResponse.from(message);
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void ensurePerformanceMember(Integer performanceId, Integer userId) {
        if (!performanceMemberRepository.existsByPerformance_PerformanceIdAndUser_UserId(performanceId, userId)) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }
    }

    private void ensureVisibleRoom(PerformanceSong performanceSong) {
        if (Boolean.TRUE.equals(performanceSong.getIsDeleted())
                || performanceSong.getSelectionStatus() != PerformanceSong.SelectionStatus.CONFIRMED) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }
    }
}
