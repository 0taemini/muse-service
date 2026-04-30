package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatMessageResponse;
import com.muse.service.backend.dto.chat.ChatRoomDetailResponse;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import com.muse.service.backend.dto.chat.ChatRoundSummaryResponse;
import com.muse.service.backend.dto.chat.FeedbackSummaryResponse;
import com.muse.service.backend.dto.performance.PerformanceSongSessionResponse;
import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.ChatRound;
import com.muse.service.backend.entity.FeedbackSummary;
import com.muse.service.backend.entity.Message;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.ChatRoundRepository;
import com.muse.service.backend.repository.FeedbackSummaryRepository;
import com.muse.service.backend.repository.MessageRepository;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatRoomServiceImpl implements ChatRoomService {

    private static final int ROUND_COOLDOWN_HOURS = 6;
    private static final int SUMMARY_PREVIEW_LIMIT = 5;

    private final PerformanceRepository performanceRepository;
    private final PerformanceSongRepository performanceSongRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoundRepository chatRoundRepository;
    private final UserRepository userRepository;
    private final PerformanceMemberRepository performanceMemberRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
    private final MessageRepository messageRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;

    @Override
    @Transactional
    public List<ChatRoomSummaryResponse> createRooms(Integer performanceId, Integer userId, ChatRoomCreateRequest request) {
        findPerformance(performanceId);
        ensureUserExists(userId);

        Set<Integer> requestedSongIds = new LinkedHashSet<>(request.performanceSongIds());
        List<PerformanceSong> performanceSongs =
                performanceSongRepository.findAllByPerformance_PerformanceIdAndPerformanceSongIdInAndIsDeletedFalse(
                        performanceId,
                        requestedSongIds
                );

        if (performanceSongs.size() != requestedSongIds.size()) {
            throw new CustomException(ErrorCode.PERFORMANCE_SONG_NOT_FOUND);
        }

        Map<Integer, PerformanceSong> performanceSongMap = performanceSongs.stream()
                .collect(Collectors.toMap(PerformanceSong::getPerformanceSongId, Function.identity()));

        List<ChatRoomSummaryResponse> createdRooms = requestedSongIds.stream()
                .map(performanceSongMap::get)
                .map(this::createRoomWithInitialRound)
                .toList();
        log.info("채팅방 생성 완료: performanceId={}, actorUserId={}, requestedCount={}, createdCount={}",
                performanceId, userId, requestedSongIds.size(), createdRooms.size());
        return createdRooms;
    }

    @Override
    @Transactional(readOnly = true)
    public ChatRoomDetailResponse getDetail(Integer performanceId, Integer chatRoomId, Integer userId) {
        findPerformance(performanceId);
        ensurePerformanceMember(performanceId, userId);
        ChatRoom chatRoom = findChatRoom(performanceId, chatRoomId);
        ensureVisibleRoom(chatRoom);

        ChatRound currentRound = chatRoundRepository
                .findFirstByChatRoom_ChatRoomIdAndStatusOrderByOpenedAtDesc(chatRoomId, ChatRound.RoundStatus.OPEN)
                .orElse(null);
        ChatRound latestRound = chatRoundRepository
                .findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(chatRoomId)
                .orElse(null);

        List<ChatMessageResponse> messages = currentRound == null
                ? List.of()
                : messageRepository.findAllByChatRound_ChatRoundIdOrderByCreatedAtAsc(currentRound.getChatRoundId())
                        .stream()
                        .map(ChatMessageResponse::from)
                        .toList();

        return new ChatRoomDetailResponse(
                ChatRoomSummaryResponse.from(chatRoom, currentRound),
                performanceSongSessionRepository
                        .findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(
                                chatRoom.getPerformanceSong().getPerformanceSongId()
                        )
                        .stream()
                        .map(PerformanceSongSessionResponse::from)
                        .toList(),
                messages,
                canStartNewRound(latestRound),
                nextRoundAvailableAt(latestRound),
                currentRound != null && currentRound.getSummarizedAt() != null
        );
    }

    @Override
    @Transactional
    public ChatRoundSummaryResponse startNewRound(Integer performanceId, Integer chatRoomId, Integer userId) {
        findPerformance(performanceId);
        ensurePerformanceMember(performanceId, userId);
        ChatRoom chatRoom = findChatRoom(performanceId, chatRoomId);
        ensureVisibleRoom(chatRoom);

        ChatRound latestRound = chatRoundRepository
                .findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(chatRoomId)
                .orElse(null);
        if (!canStartNewRound(latestRound)) {
            throw new CustomException(ErrorCode.CHAT_ROUND_COOLDOWN);
        }

        chatRoundRepository
                .findFirstByChatRoom_ChatRoomIdAndStatusOrderByOpenedAtDesc(chatRoomId, ChatRound.RoundStatus.OPEN)
                .ifPresent(ChatRound::close);

        ChatRound newRound = chatRoundRepository.save(
                ChatRound.builder()
                        .chatRoom(chatRoom)
                        .status(ChatRound.RoundStatus.OPEN)
                        .build()
        );
        log.info("채팅 라운드 생성 완료: performanceId={}, chatRoomId={}, chatRoundId={}, actorUserId={}",
                performanceId, chatRoomId, newRound.getChatRoundId(), userId);
        return ChatRoundSummaryResponse.from(newRound);
    }

    @Override
    @Transactional
    public List<FeedbackSummaryResponse> summarizeRound(
            Integer performanceId,
            Integer chatRoomId,
            Integer chatRoundId,
            Integer userId
    ) {
        findPerformance(performanceId);
        User user = findUser(userId);
        ensurePerformanceMember(performanceId, userId);
        ChatRoom chatRoom = findChatRoom(performanceId, chatRoomId);
        ensureVisibleRoom(chatRoom);
        ChatRound chatRound = chatRoundRepository.findByChatRoundIdAndChatRoom_ChatRoomId(chatRoundId, chatRoomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROUND_NOT_FOUND));

        if (chatRound.getSummarizedAt() != null || feedbackSummaryRepository.existsByChatRound_ChatRoundId(chatRoundId)) {
            throw new CustomException(ErrorCode.CHAT_ROUND_ALREADY_SUMMARIZED);
        }

        List<Message> messages = messageRepository.findAllByChatRound_ChatRoundIdOrderByCreatedAtAsc(chatRoundId);
        if (messages.isEmpty()) {
            throw new CustomException(ErrorCode.CHAT_ROUND_NO_MESSAGES);
        }

        Map<Integer, List<Message>> messagesBySession = messages.stream()
                .collect(Collectors.groupingBy(
                        message -> message.getTargetPerformanceSongSession().getPerformanceSongSessionId(),
                        java.util.LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<FeedbackSummary> summaries = messagesBySession.values().stream()
                .map(sessionMessages -> feedbackSummaryRepository.save(
                        FeedbackSummary.builder()
                                .chatRound(chatRound)
                                .targetUser(sessionMessages.get(0).getTargetPerformanceSongSession().getAssignedUser())
                                .performanceSongSession(sessionMessages.get(0).getTargetPerformanceSongSession())
                                .summaryText(buildSummaryText(sessionMessages))
                                .createdBy(user)
                                .build()
                ))
                .toList();
        chatRound.markSummarized(user);
        log.info("채팅 라운드 피드백 종합 완료: performanceId={}, chatRoomId={}, chatRoundId={}, actorUserId={}, summaryCount={}",
                performanceId, chatRoomId, chatRoundId, userId, summaries.size());

        return summaries.stream()
                .map(FeedbackSummaryResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatRoomSummaryResponse> getVisibleRooms(Integer performanceId) {
        findPerformance(performanceId);

        return chatRoomRepository.findVisibleByPerformanceId(
                        performanceId,
                        PerformanceSong.SelectionStatus.CONFIRMED
                ).stream()
                .map(chatRoom -> ChatRoomSummaryResponse.from(
                        chatRoom,
                        chatRoundRepository.findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(chatRoom.getChatRoomId())
                                .orElse(null)
                ))
                .toList();
    }

    private ChatRoomSummaryResponse createRoomWithInitialRound(PerformanceSong performanceSong) {
        validateCreatableSong(performanceSong);

        ChatRoom chatRoom = chatRoomRepository.save(
                ChatRoom.builder()
                        .performanceSong(performanceSong)
                        .build()
        );

        ChatRound chatRound = chatRoundRepository.save(
                ChatRound.builder()
                        .chatRoom(chatRoom)
                        .status(ChatRound.RoundStatus.OPEN)
                        .build()
        );
        log.info("채팅방 및 초기 라운드 생성 완료: performanceSongId={}, chatRoomId={}, chatRoundId={}",
                performanceSong.getPerformanceSongId(), chatRoom.getChatRoomId(), chatRound.getChatRoundId());

        return ChatRoomSummaryResponse.from(chatRoom, chatRound);
    }

    private void validateCreatableSong(PerformanceSong performanceSong) {
        if (performanceSong.getSelectionStatus() != PerformanceSong.SelectionStatus.CONFIRMED) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ONLY_CONFIRMED_ALLOWED);
        }

        if (chatRoomRepository.existsByPerformanceSong_PerformanceSongId(performanceSong.getPerformanceSongId())) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ALREADY_EXISTS);
        }
    }

    private Performance findPerformance(Integer performanceId) {
        return performanceRepository.findById(performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_NOT_FOUND));
    }

    private void ensureUserExists(Integer userId) {
        findUser(userId);
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private ChatRoom findChatRoom(Integer performanceId, Integer chatRoomId) {
        return chatRoomRepository.findByChatRoomIdAndPerformanceSong_Performance_PerformanceId(chatRoomId, performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
    }

    private void ensurePerformanceMember(Integer performanceId, Integer userId) {
        findUser(userId);
        if (!performanceMemberRepository.existsByPerformance_PerformanceIdAndUser_UserId(performanceId, userId)) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }
    }

    private void ensureVisibleRoom(ChatRoom chatRoom) {
        PerformanceSong performanceSong = chatRoom.getPerformanceSong();
        if (Boolean.TRUE.equals(performanceSong.getIsDeleted())
                || performanceSong.getSelectionStatus() != PerformanceSong.SelectionStatus.CONFIRMED) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }
    }

    private boolean canStartNewRound(ChatRound latestRound) {
        if (latestRound == null) {
            return true;
        }
        return !nextRoundAvailableAt(latestRound).isAfter(LocalDateTime.now());
    }

    private LocalDateTime nextRoundAvailableAt(ChatRound latestRound) {
        if (latestRound == null) {
            return null;
        }
        return latestRound.getOpenedAt().plusHours(ROUND_COOLDOWN_HOURS);
    }

    private String buildSummaryText(List<Message> messages) {
        PerformanceSongSession session = messages.get(0).getTargetPerformanceSongSession();
        String previews = messages.stream()
                .limit(SUMMARY_PREVIEW_LIMIT)
                .map(message -> "- " + message.getContent())
                .collect(Collectors.joining("\n"));

        return "%s 세션에 대한 피드백 %d건을 정리했습니다.\n%s".formatted(
                session.getSessionName(),
                messages.size(),
                previews
        );
    }
}
