package com.muse.service.backend.service.chat;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.ChatRound;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.ChatRoundRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatRoomServiceImpl implements ChatRoomService {

    private final PerformanceRepository performanceRepository;
    private final PerformanceSongRepository performanceSongRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoundRepository chatRoundRepository;
    private final UserRepository userRepository;

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

        return requestedSongIds.stream()
                .map(performanceSongMap::get)
                .map(this::createRoomWithInitialRound)
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
        userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
