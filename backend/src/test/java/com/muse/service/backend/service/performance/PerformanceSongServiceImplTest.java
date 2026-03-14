package com.muse.service.backend.service.performance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.performance.PerformanceSongCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongSessionAssignmentRequest;
import com.muse.service.backend.dto.performance.PerformanceSongSessionsUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongStatusUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongUpdateRequest;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSessionSource;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSessionColumnRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PerformanceSongServiceImplTest {

    @Mock
    private PerformanceRepository performanceRepository;

    @Mock
    private PerformanceSongRepository performanceSongRepository;

    @Mock
    private PerformanceSongSessionRepository performanceSongSessionRepository;

    @Mock
    private PerformanceSessionColumnRepository performanceSessionColumnRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private PerformanceSessionColumnService performanceSessionColumnService;

    private PerformanceSongServiceImpl performanceSongService;

    @BeforeEach
    void setUp() {
        performanceSongService = new PerformanceSongServiceImpl(
                performanceRepository,
                performanceSongRepository,
                performanceSongSessionRepository,
                performanceSessionColumnRepository,
                userRepository,
                chatRoomRepository,
                performanceSessionColumnService
        );
    }

    @Test
    void create_usesPerformanceColumnsWhenSongAdded() {
        Performance performance = performance(1);
        User user = user(3);
        PerformanceSessionColumn maleVocal = performanceSessionColumn(501, performance, null, "Male Vocal", 1);
        PerformanceSessionColumn guitarColumn = performanceSessionColumn(
                502,
                performance,
                sessionType(10, "GUITAR1", "Guitar 1", 2),
                "Guitar 1",
                2
        );
        PerformanceSong savedSong = performanceSong(100, performance, user, "Song", "Singer", 1);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(userRepository.findById(3)).thenReturn(Optional.of(user));
        when(performanceSongRepository.findMaxOrderNoByPerformanceId(1)).thenReturn(0);
        when(performanceSongRepository.save(any(PerformanceSong.class))).thenReturn(savedSong);
        when(performanceSessionColumnService.ensureDefaultColumns(1)).thenReturn(List.of(maleVocal, guitarColumn));
        when(performanceSongSessionRepository.save(any(PerformanceSongSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(false);

        var response = performanceSongService.create(
                1,
                3,
                new PerformanceSongCreateRequest(" Song ", " Singer ", null, null, null)
        );

        assertThat(response.performanceSongId()).isEqualTo(100);
        assertThat(response.sessions()).hasSize(2);
        assertThat(response.sessions().get(0).performanceSessionColumnId()).isEqualTo(501);
        assertThat(response.sessions().get(1).sessionName()).isEqualTo("Guitar 1");
    }

    @Test
    void update_blocksWhenChatRoomAlreadyExists() {
        Performance performance = performance(1);
        PerformanceSong performanceSong = performanceSong(100, performance, user(3), "Song", "Singer", 1);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(performanceSongRepository.findByPerformanceSongIdAndPerformance_PerformanceId(100, 1))
                .thenReturn(Optional.of(performanceSong));
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(true);

        assertThatThrownBy(() -> performanceSongService.update(
                1,
                100,
                3,
                new PerformanceSongUpdateRequest("New Song", "New Singer", true, 2)
        )).isInstanceOfSatisfying(CustomException.class, exception -> {
            assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.PERFORMANCE_SONG_LOCKED);
            assertThat(exception).hasMessage("채팅방이 생성된 뒤에는 세션 구조만 수정할 수 있습니다.");
        });
    }

    @Test
    void updateStatus_allowsNonAuthorBeforeChatRoom() {
        Performance performance = performance(1);
        PerformanceSong performanceSong = performanceSong(100, performance, user(3), "Song", "Singer", 1);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(userRepository.findById(9)).thenReturn(Optional.of(user(9)));
        when(performanceSongRepository.findByPerformanceSongIdAndPerformance_PerformanceId(100, 1))
                .thenReturn(Optional.of(performanceSong));
        when(performanceSongSessionRepository.findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(100))
                .thenReturn(List.of());
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(false);

        var response = performanceSongService.updateStatus(
                1,
                100,
                9,
                new PerformanceSongStatusUpdateRequest(PerformanceSong.SelectionStatus.OUT)
        );

        assertThat(response.selectionStatus()).isEqualTo(PerformanceSong.SelectionStatus.OUT);
    }

    @Test
    void delete_marksSongDeletedWhenAuthorAndNoChatRoom() {
        Performance performance = performance(1);
        User author = user(3);
        PerformanceSong performanceSong = performanceSong(100, performance, author, "Song", "Singer", 1);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(performanceSongRepository.findByPerformanceSongIdAndPerformance_PerformanceId(100, 1))
                .thenReturn(Optional.of(performanceSong));
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(false);
        when(userRepository.findById(3)).thenReturn(Optional.of(author));

        performanceSongService.delete(1, 100, 3);

        assertThat(performanceSong.getIsDeleted()).isTrue();
        verify(performanceSongSessionRepository, never()).save(any());
    }

    @Test
    void updateSessions_updatesAssignmentsUsingPerformanceColumns() {
        Performance performance = performance(1);
        User author = user(3);
        User assigned = user(7);
        PerformanceSong performanceSong = performanceSong(100, performance, author, "Song", "Singer", 1);
        PerformanceSessionColumn guitar = performanceSessionColumn(
                501,
                performance,
                sessionType(10, "GUITAR1", "Guitar 1", 1),
                "Guitar 1",
                1
        );
        PerformanceSessionColumn synth = performanceSessionColumn(
                502,
                performance,
                sessionType(11, "SYNTH1", "Synth 1", 2),
                "Synth 1",
                2
        );
        PerformanceSongSession existingSession = performanceSongSession(1000, performanceSong, guitar);

        when(performanceRepository.findById(1)).thenReturn(Optional.of(performance));
        when(performanceSongRepository.findByPerformanceSongIdAndPerformance_PerformanceId(100, 1))
                .thenReturn(Optional.of(performanceSong));
        when(performanceSessionColumnRepository.findByPerformanceSessionColumnIdAndPerformance_PerformanceId(501, 1))
                .thenReturn(Optional.of(guitar));
        when(performanceSessionColumnRepository.findByPerformanceSessionColumnIdAndPerformance_PerformanceId(502, 1))
                .thenReturn(Optional.of(synth));
        when(performanceSongSessionRepository
                .findByPerformanceSong_PerformanceSongIdAndPerformanceSessionColumn_PerformanceSessionColumnId(100, 501))
                .thenReturn(Optional.of(existingSession));
        when(performanceSongSessionRepository
                .findByPerformanceSong_PerformanceSongIdAndPerformanceSessionColumn_PerformanceSessionColumnId(100, 502))
                .thenReturn(Optional.empty());
        when(performanceSongSessionRepository.save(any(PerformanceSongSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(7)).thenReturn(Optional.of(assigned));
        when(chatRoomRepository.existsByPerformanceSong_PerformanceSongId(100)).thenReturn(false);

        var response = performanceSongService.updateSessions(
                1,
                100,
                3,
                new PerformanceSongSessionsUpdateRequest(List.of(
                        new PerformanceSongSessionAssignmentRequest(501, 7),
                        new PerformanceSongSessionAssignmentRequest(502, null)
                ))
        );

        assertThat(response.sessions()).hasSize(2);
        assertThat(response.sessions().get(0).assignedUserId()).isEqualTo(7);
        assertThat(response.sessions().get(1).performanceSessionColumnId()).isEqualTo(502);
    }

    private Performance performance(Integer id) {
        Performance performance = Performance.builder()
                .title("Performance")
                .build();
        ReflectionTestUtils.setField(performance, "performanceId", id);
        ReflectionTestUtils.setField(performance, "createdAt", LocalDateTime.of(2026, 3, 12, 10, 0));
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

    private SessionType sessionType(Integer id, String code, String name, Integer sortOrder) {
        SessionType sessionType = SessionType.builder()
                .code(code)
                .displayName(name)
                .sortOrder(sortOrder)
                .isDefault(Boolean.TRUE)
                .isActive(Boolean.TRUE)
                .build();
        ReflectionTestUtils.setField(sessionType, "sessionTypeId", id);
        return sessionType;
    }

    private PerformanceSessionColumn performanceSessionColumn(
            Integer id,
            Performance performance,
            SessionType sessionType,
            String sessionName,
            Integer displayOrder
    ) {
        PerformanceSessionColumn column = PerformanceSessionColumn.builder()
                .performance(performance)
                .baseSessionType(sessionType)
                .sessionName(sessionName)
                .isRequired(Boolean.TRUE)
                .displayOrder(displayOrder)
                .sessionSource(PerformanceSessionSource.DEFAULT)
                .build();
        ReflectionTestUtils.setField(column, "performanceSessionColumnId", id);
        return column;
    }

    private PerformanceSong performanceSong(
            Integer id,
            Performance performance,
            User createdByUser,
            String title,
            String singer,
            Integer orderNo
    ) {
        PerformanceSong performanceSong = PerformanceSong.builder()
                .performance(performance)
                .songTitle(title)
                .singer(singer)
                .isSheet(Boolean.FALSE)
                .orderNo(orderNo)
                .selectionStatus(PerformanceSong.SelectionStatus.NOT_BAD)
                .createdByUser(createdByUser)
                .build();
        ReflectionTestUtils.setField(performanceSong, "performanceSongId", id);
        ReflectionTestUtils.setField(performanceSong, "isDeleted", Boolean.FALSE);
        return performanceSong;
    }

    private PerformanceSongSession performanceSongSession(
            Integer id,
            PerformanceSong performanceSong,
            PerformanceSessionColumn performanceSessionColumn
    ) {
        PerformanceSongSession session = PerformanceSongSession.builder()
                .performanceSong(performanceSong)
                .performanceSessionColumn(performanceSessionColumn)
                .baseSessionType(performanceSessionColumn.getBaseSessionType())
                .sessionName(performanceSessionColumn.getSessionName())
                .isRequired(Boolean.TRUE)
                .displayOrder(performanceSessionColumn.getDisplayOrder())
                .assignedUser(null)
                .sessionSource(performanceSessionColumn.getSessionSource())
                .build();
        ReflectionTestUtils.setField(session, "performanceSongSessionId", id);
        return session;
    }
}
