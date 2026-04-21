package com.muse.service.backend.service.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.entity.ChatRoom;
import com.muse.service.backend.entity.ChatRound;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.ChatRoundRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ChatRoomServiceImplTest {

    @Mock
    private PerformanceRepository performanceRepository;

    @Mock
    private PerformanceSongRepository performanceSongRepository;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private ChatRoundRepository chatRoundRepository;

    @Mock
    private UserRepository userRepository;

    private ChatRoomServiceImpl chatRoomService;

    @BeforeEach
    void setUp() {
        chatRoomService = new ChatRoomServiceImpl(
                performanceRepository,
                performanceSongRepository,
                chatRoomRepository,
                chatRoundRepository,
                userRepository
        );
    }

    @Test
    void createRooms_createsRoomAndInitialRoundForConfirmedSongs() {
        Performance performance = performance(1);
        User user = user(7);
        PerformanceSong song = performanceSong(100, performance, PerformanceSong.SelectionStatus.CONFIRMED);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(performanceSongRepository.findAllByPerformance_PerformanceIdAndPerformanceSongIdInAndIsDeletedFalse(1, Set.of(100)))
                .thenReturn(List.of(song));
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(false);
        when(chatRoomRepository.save(any(ChatRoom.class))).thenAnswer(invocation -> {
            ChatRoom chatRoom = invocation.getArgument(0);
            ReflectionTestUtils.setField(chatRoom, "chatRoomId", 300);
            return chatRoom;
        });
        when(chatRoundRepository.save(any(ChatRound.class))).thenAnswer(invocation -> {
            ChatRound chatRound = invocation.getArgument(0);
            ReflectionTestUtils.setField(chatRound, "chatRoundId", 400);
            ReflectionTestUtils.setField(chatRound, "openedAt", LocalDateTime.of(2026, 4, 21, 20, 0));
            ReflectionTestUtils.setField(chatRound, "status", ChatRound.RoundStatus.OPEN);
            return chatRound;
        });

        var response = chatRoomService.createRooms(1, 7, new ChatRoomCreateRequest(List.of(100)));

        assertThat(response).hasSize(1);
        assertThat(response.get(0).chatRoomId()).isEqualTo(300);
        assertThat(response.get(0).performanceSongId()).isEqualTo(100);
        assertThat(response.get(0).currentRound()).isNotNull();
        assertThat(response.get(0).currentRound().chatRoundId()).isEqualTo(400);
    }

    @Test
    void createRooms_rejectsSongWhenNotConfirmed() {
        Performance performance = performance(1);
        User user = user(7);
        PerformanceSong song = performanceSong(100, performance, PerformanceSong.SelectionStatus.NOT_BAD);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(performanceSongRepository.findAllByPerformance_PerformanceIdAndPerformanceSongIdInAndIsDeletedFalse(1, Set.of(100)))
                .thenReturn(List.of(song));

        assertThatThrownBy(() -> chatRoomService.createRooms(1, 7, new ChatRoomCreateRequest(List.of(100))))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.CHAT_ROOM_ONLY_CONFIRMED_ALLOWED));
    }

    @Test
    void getVisibleRooms_returnsRoomsSortedBySongOrder() {
        Performance performance = performance(1);
        PerformanceSong firstSong = performanceSong(100, performance, PerformanceSong.SelectionStatus.CONFIRMED);
        PerformanceSong secondSong = performanceSong(101, performance, PerformanceSong.SelectionStatus.CONFIRMED);
        ReflectionTestUtils.setField(firstSong, "orderNo", 1);
        ReflectionTestUtils.setField(secondSong, "orderNo", 2);
        ChatRoom firstRoom = chatRoom(10, firstSong);
        ChatRoom secondRoom = chatRoom(11, secondSong);
        ChatRound secondRound = chatRound(20, secondRoom);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(chatRoomRepository.findVisibleByPerformanceId(1, PerformanceSong.SelectionStatus.CONFIRMED))
                .thenReturn(List.of(firstRoom, secondRoom));
        when(chatRoundRepository.findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(10)).thenReturn(Optional.empty());
        when(chatRoundRepository.findFirstByChatRoom_ChatRoomIdOrderByOpenedAtDesc(11)).thenReturn(Optional.of(secondRound));

        var response = chatRoomService.getVisibleRooms(1);

        assertThat(response).hasSize(2);
        assertThat(response.get(0).chatRoomId()).isEqualTo(10);
        assertThat(response.get(1).currentRound()).isNotNull();
        assertThat(response.get(1).currentRound().chatRoundId()).isEqualTo(20);
        verify(chatRoomRepository).findVisibleByPerformanceId(1, PerformanceSong.SelectionStatus.CONFIRMED);
    }

    private Performance performance(Integer id) {
        Performance performance = Performance.builder()
                .title("Performance")
                .build();
        ReflectionTestUtils.setField(performance, "performanceId", id);
        ReflectionTestUtils.setField(performance, "createdAt", LocalDateTime.of(2026, 4, 1, 12, 0));
        return performance;
    }

    private User user(Integer id) {
        User user = User.builder()
                .allUser(null)
                .name("User " + id)
                .cohort(1)
                .email("user" + id + "@example.com")
                .password("encoded")
                .nickname("user" + id)
                .representativeSessionType(null)
                .rank(User.UserRank.ACTIVE)
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.USER)
                .build();
        ReflectionTestUtils.setField(user, "userId", id);
        return user;
    }

    private PerformanceSong performanceSong(Integer id, Performance performance, PerformanceSong.SelectionStatus status) {
        PerformanceSong performanceSong = PerformanceSong.builder()
                .performance(performance)
                .songTitle("Song " + id)
                .singer("Singer")
                .isSheet(Boolean.FALSE)
                .orderNo(1)
                .selectionStatus(status)
                .createdByUser(null)
                .build();
        ReflectionTestUtils.setField(performanceSong, "performanceSongId", id);
        ReflectionTestUtils.setField(performanceSong, "isDeleted", Boolean.FALSE);
        return performanceSong;
    }

    private ChatRoom chatRoom(Integer id, PerformanceSong performanceSong) {
        ChatRoom chatRoom = ChatRoom.builder()
                .performanceSong(performanceSong)
                .build();
        ReflectionTestUtils.setField(chatRoom, "chatRoomId", id);
        return chatRoom;
    }

    private ChatRound chatRound(Integer id, ChatRoom chatRoom) {
        ChatRound chatRound = ChatRound.builder()
                .chatRoom(chatRoom)
                .status(ChatRound.RoundStatus.OPEN)
                .build();
        ReflectionTestUtils.setField(chatRound, "chatRoundId", id);
        ReflectionTestUtils.setField(chatRound, "openedAt", LocalDateTime.of(2026, 4, 21, 20, 0));
        return chatRound;
    }
}
