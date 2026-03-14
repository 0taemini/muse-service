package com.muse.service.backend.service.seed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSessionSource;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.repository.PerformanceSessionColumnRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.SessionTypeRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SessionTypeSeedServiceImplTest {

    @Mock
    private SessionTypeRepository sessionTypeRepository;

    @Mock
    private PerformanceSessionColumnRepository performanceSessionColumnRepository;

    @Mock
    private PerformanceSongSessionRepository performanceSongSessionRepository;

    private SessionTypeSeedServiceImpl sessionTypeSeedService;

    @BeforeEach
    void setUp() {
        sessionTypeSeedService = new SessionTypeSeedServiceImpl(
                sessionTypeRepository,
                performanceSessionColumnRepository,
                performanceSongSessionRepository
        );
    }

    @Test
    void ensureDefaults_insertsMissingDefaultsAndRepairsDefaultColumns() {
        PerformanceSessionColumn maleVocalColumn = performanceSessionColumn(11, "남보컬", null, PerformanceSessionSource.DEFAULT);
        PerformanceSongSession maleVocalSession = performanceSongSession(21, maleVocalColumn);

        when(sessionTypeRepository.findAll()).thenReturn(List.of());
        when(sessionTypeRepository.save(any(SessionType.class))).thenAnswer(invocation -> {
            SessionType sessionType = invocation.getArgument(0);
            ReflectionTestUtils.setField(sessionType, "sessionTypeId", nextId(sessionType.getCode()));
            return sessionType;
        });
        when(performanceSessionColumnRepository.findAll()).thenReturn(List.of(maleVocalColumn));
        when(performanceSongSessionRepository.findAll()).thenReturn(List.of(maleVocalSession));

        SessionTypeSeedService.RepairResult result = sessionTypeSeedService.ensureDefaults();

        assertThat(result.insertedCount()).isEqualTo(7);
        assertThat(result.updatedCount()).isZero();
        assertThat(result.repairedColumnCount()).isEqualTo(1);
        assertThat(result.repairedSongSessionCount()).isEqualTo(1);
        assertThat(maleVocalColumn.getBaseSessionType()).isNotNull();
        assertThat(maleVocalColumn.getBaseSessionType().getCode()).isEqualTo("MALE_VOCAL");
        assertThat(maleVocalSession.getBaseSessionType()).isNotNull();
        assertThat(maleVocalSession.getBaseSessionType().getCode()).isEqualTo("MALE_VOCAL");
    }

    @Test
    void ensureDefaults_updatesExistingDefaultMetadata() {
        SessionType guitar = SessionType.builder()
                .code("GUITAR1")
                .displayName("기타일")
                .sortOrder(99)
                .isDefault(Boolean.FALSE)
                .isActive(Boolean.FALSE)
                .build();
        ReflectionTestUtils.setField(guitar, "sessionTypeId", 3);

        when(sessionTypeRepository.findAll()).thenReturn(List.of(guitar));
        when(sessionTypeRepository.save(any(SessionType.class))).thenAnswer(invocation -> {
            SessionType sessionType = invocation.getArgument(0);
            ReflectionTestUtils.setField(sessionType, "sessionTypeId", nextId(sessionType.getCode()));
            return sessionType;
        });
        when(performanceSessionColumnRepository.findAll()).thenReturn(List.of());
        when(performanceSongSessionRepository.findAll()).thenReturn(List.of());

        SessionTypeSeedService.RepairResult result = sessionTypeSeedService.ensureDefaults();

        assertThat(result.insertedCount()).isEqualTo(6);
        assertThat(result.updatedCount()).isEqualTo(1);
        assertThat(guitar.getDisplayName()).isEqualTo("기타1");
        assertThat(guitar.getSortOrder()).isEqualTo(3);
        assertThat(guitar.getIsDefault()).isTrue();
        assertThat(guitar.getIsActive()).isTrue();
        verify(sessionTypeRepository, times(6)).save(any(SessionType.class));
    }

    private int nextId(String code) {
        return switch (Optional.ofNullable(code).orElse("")) {
            case "MALE_VOCAL" -> 1;
            case "FEMALE_VOCAL" -> 2;
            case "GUITAR1" -> 3;
            case "GUITAR2" -> 4;
            case "BASS" -> 5;
            case "DRUM" -> 6;
            case "SYNTH1" -> 7;
            default -> 99;
        };
    }

    private PerformanceSessionColumn performanceSessionColumn(
            Integer id,
            String sessionName,
            SessionType baseSessionType,
            PerformanceSessionSource sessionSource
    ) {
        PerformanceSessionColumn column = PerformanceSessionColumn.builder()
                .performance(Performance.builder().title("Performance").build())
                .baseSessionType(baseSessionType)
                .sessionName(sessionName)
                .isRequired(Boolean.TRUE)
                .displayOrder(1)
                .sessionSource(sessionSource)
                .build();
        ReflectionTestUtils.setField(column, "performanceSessionColumnId", id);
        return column;
    }

    private PerformanceSongSession performanceSongSession(Integer id, PerformanceSessionColumn performanceSessionColumn) {
        PerformanceSongSession session = PerformanceSongSession.builder()
                .performanceSong(
                        PerformanceSong.builder()
                                .performance(Performance.builder().title("Performance").build())
                                .songTitle("Song")
                                .singer("Singer")
                                .isSheet(Boolean.FALSE)
                                .orderNo(1)
                                .selectionStatus(PerformanceSong.SelectionStatus.NOT_BAD)
                                .createdByUser(user(1))
                                .build()
                )
                .performanceSessionColumn(performanceSessionColumn)
                .baseSessionType(null)
                .sessionName(performanceSessionColumn.getSessionName())
                .isRequired(Boolean.TRUE)
                .displayOrder(1)
                .assignedUser(null)
                .sessionSource(PerformanceSessionSource.DEFAULT)
                .build();
        ReflectionTestUtils.setField(session, "performanceSongSessionId", id);
        return session;
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
}
