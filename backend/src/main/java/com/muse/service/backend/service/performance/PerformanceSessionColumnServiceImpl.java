package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceSessionColumnResponse;
import com.muse.service.backend.dto.performance.PerformanceSessionColumnUpsertRequest;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSessionSource;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.global.exception.PerformanceNotFoundException;
import com.muse.service.backend.global.exception.PerformanceSessionColumnDuplicateException;
import com.muse.service.backend.global.exception.PerformanceSessionColumnLockedException;
import com.muse.service.backend.global.exception.PerformanceSessionColumnNotFoundException;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSessionColumnRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.SessionTypeRepository;
import com.muse.service.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceSessionColumnServiceImpl implements PerformanceSessionColumnService {

    private static final List<DefaultColumnSpec> DEFAULT_COLUMNS = List.of(
            new DefaultColumnSpec("\uB0A8\uBCF4\uCEEC", List.of("MALE_VOCAL", "VOCAL_MALE", "MAIN_VOCAL_M", "VOCAL_M")),
            new DefaultColumnSpec("\uC5EC\uBCF4\uCEEC", List.of("FEMALE_VOCAL", "VOCAL_FEMALE", "MAIN_VOCAL_F", "VOCAL_F")),
            new DefaultColumnSpec("\uAE30\uD0C01", List.of("GUITAR1", "GUITAR_1")),
            new DefaultColumnSpec("\uAE30\uD0C02", List.of("GUITAR2", "GUITAR_2")),
            new DefaultColumnSpec("\uBCA0\uC774\uC2A4", List.of("BASS")),
            new DefaultColumnSpec("\uB4DC\uB7FC", List.of("DRUM", "DRUMS")),
            new DefaultColumnSpec("\uC2E0\uB5141", List.of("SYNTH1", "SYNTH_1", "KEYBOARD1", "KEYBOARD_1"))
    );

    private final PerformanceRepository performanceRepository;
    private final PerformanceSessionColumnRepository performanceSessionColumnRepository;
    private final PerformanceSongRepository performanceSongRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
    private final SessionTypeRepository sessionTypeRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;

    @Override
    @Transactional
    public List<PerformanceSessionColumnResponse> getAll(Integer performanceId) {
        return ensureDefaultColumns(performanceId).stream()
                .map(PerformanceSessionColumnResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public PerformanceSessionColumnResponse create(
            Integer performanceId,
            Integer userId,
            PerformanceSessionColumnUpsertRequest request
    ) {
        findUser(userId);
        Performance performance = findPerformance(performanceId);
        ensureDefaultColumns(performanceId);
        ensurePerformanceUnlocked(performanceId);
        validateDuplicateName(performanceId, request.sessionName(), null);

        PerformanceSessionColumn column = performanceSessionColumnRepository.save(
                PerformanceSessionColumn.builder()
                        .performance(performance)
                        .baseSessionType(findBaseSessionType(request.baseSessionTypeId()))
                        .sessionName(request.sessionName().trim())
                        .isRequired(defaultIfNull(request.isRequired(), Boolean.TRUE))
                        .displayOrder(resolveDisplayOrder(performanceId, request.displayOrder()))
                        .sessionSource(resolveSource(request.baseSessionTypeId(), PerformanceSessionSource.CUSTOM))
                        .build()
        );

        syncColumnToAllSongs(column);
        return PerformanceSessionColumnResponse.from(column);
    }

    @Override
    @Transactional
    public PerformanceSessionColumnResponse update(
            Integer performanceId,
            Integer performanceSessionColumnId,
            Integer userId,
            PerformanceSessionColumnUpsertRequest request
    ) {
        findUser(userId);
        ensureDefaultColumns(performanceId);
        ensurePerformanceUnlocked(performanceId);

        PerformanceSessionColumn column = performanceSessionColumnRepository
                .findByPerformanceSessionColumnIdAndPerformance_PerformanceId(performanceSessionColumnId, performanceId)
                .orElseThrow(PerformanceSessionColumnNotFoundException::new);

        validateDuplicateName(performanceId, request.sessionName(), performanceSessionColumnId);

        PerformanceSessionSource sessionSource = column.getSessionSource() == PerformanceSessionSource.DEFAULT
                ? PerformanceSessionSource.DEFAULT
                : resolveSource(request.baseSessionTypeId(), PerformanceSessionSource.CUSTOM);

        column.updateStructure(
                findBaseSessionType(request.baseSessionTypeId()),
                request.sessionName().trim(),
                defaultIfNull(request.isRequired(), Boolean.TRUE),
                resolveUpdatedDisplayOrder(column, request.displayOrder()),
                sessionSource
        );

        syncExistingSongSessions(column);
        return PerformanceSessionColumnResponse.from(column);
    }

    @Override
    @Transactional
    public List<PerformanceSessionColumn> ensureDefaultColumns(Integer performanceId) {
        Performance performance = findPerformance(performanceId);
        List<PerformanceSessionColumn> columns =
                performanceSessionColumnRepository.findAllByPerformance_PerformanceIdOrderByDisplayOrderAsc(performanceId);
        if (!columns.isEmpty()) {
            return columns;
        }

        List<SessionType> activeSessionTypes = sessionTypeRepository.findAllByIsActiveTrueOrderBySortOrderAsc();
        List<PerformanceSessionColumn> createdColumns = new ArrayList<>();
        int displayOrder = 1;
        for (DefaultColumnSpec spec : DEFAULT_COLUMNS) {
            SessionType baseSessionType = matchSessionType(activeSessionTypes, spec);
            createdColumns.add(
                    performanceSessionColumnRepository.save(
                            PerformanceSessionColumn.builder()
                                    .performance(performance)
                                    .baseSessionType(baseSessionType)
                                    .sessionName(spec.sessionName())
                                    .isRequired(Boolean.TRUE)
                                    .displayOrder(displayOrder++)
                                    .sessionSource(PerformanceSessionSource.DEFAULT)
                                    .build()
                    )
            );
        }

        return createdColumns;
    }

    private void syncColumnToAllSongs(PerformanceSessionColumn column) {
        List<PerformanceSong> songs =
                performanceSongRepository.findAllByPerformance_PerformanceIdAndIsDeletedFalseOrderByOrderNoAsc(
                        column.getPerformance().getPerformanceId()
                );

        for (PerformanceSong song : songs) {
            performanceSongSessionRepository
                    .findByPerformanceSong_PerformanceSongIdAndPerformanceSessionColumn_PerformanceSessionColumnId(
                            song.getPerformanceSongId(),
                            column.getPerformanceSessionColumnId()
                    )
                    .orElseGet(() -> performanceSongSessionRepository.save(createSongSession(song, column)));
        }
    }

    private void syncExistingSongSessions(PerformanceSessionColumn column) {
        for (PerformanceSongSession songSession
                : performanceSongSessionRepository.findAllByPerformanceSessionColumn_PerformanceSessionColumnId(
                column.getPerformanceSessionColumnId())) {
            songSession.applyColumn(column);
        }
    }

    private PerformanceSongSession createSongSession(PerformanceSong song, PerformanceSessionColumn column) {
        return PerformanceSongSession.builder()
                .performanceSong(song)
                .performanceSessionColumn(column)
                .baseSessionType(column.getBaseSessionType())
                .sessionName(column.getSessionName())
                .isRequired(column.getIsRequired())
                .displayOrder(column.getDisplayOrder())
                .assignedUser(null)
                .sessionSource(column.getSessionSource())
                .build();
    }

    private Performance findPerformance(Integer performanceId) {
        return performanceRepository.findById(performanceId)
                .orElseThrow(PerformanceNotFoundException::new);
    }

    private SessionType findBaseSessionType(Integer sessionTypeId) {
        if (sessionTypeId == null) {
            return null;
        }
        return sessionTypeRepository.findById(sessionTypeId)
                .orElseThrow(PerformanceSessionColumnNotFoundException::new);
    }

    private void findUser(Integer userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void ensurePerformanceUnlocked(Integer performanceId) {
        if (chatRoomRepository.existsByPerformanceSong_Performance_PerformanceIdAndPerformanceSong_IsDeletedFalse(performanceId)) {
            throw new PerformanceSessionColumnLockedException();
        }
    }

    private void validateDuplicateName(Integer performanceId, String sessionName, Integer excludeColumnId) {
        String trimmedName = sessionName.trim();
        boolean duplicated = excludeColumnId == null
                ? performanceSessionColumnRepository.existsByPerformance_PerformanceIdAndSessionNameIgnoreCase(
                        performanceId,
                        trimmedName
                )
                : performanceSessionColumnRepository
                        .existsByPerformance_PerformanceIdAndSessionNameIgnoreCaseAndPerformanceSessionColumnIdNot(
                                performanceId,
                                trimmedName,
                                excludeColumnId
                        );
        if (duplicated) {
            throw new PerformanceSessionColumnDuplicateException();
        }
    }

    private Integer resolveDisplayOrder(Integer performanceId, Integer requestedDisplayOrder) {
        if (requestedDisplayOrder != null) {
            return requestedDisplayOrder;
        }
        List<PerformanceSessionColumn> columns =
                performanceSessionColumnRepository.findAllByPerformance_PerformanceIdOrderByDisplayOrderAsc(performanceId);
        if (columns.isEmpty()) {
            return 1;
        }
        return columns.get(columns.size() - 1).getDisplayOrder() + 1;
    }

    private Integer resolveUpdatedDisplayOrder(PerformanceSessionColumn column, Integer requestedDisplayOrder) {
        return requestedDisplayOrder == null ? column.getDisplayOrder() : requestedDisplayOrder;
    }

    private PerformanceSessionSource resolveSource(Integer sessionTypeId, PerformanceSessionSource fallback) {
        return sessionTypeId == null ? fallback : PerformanceSessionSource.DEFAULT;
    }

    private SessionType matchSessionType(List<SessionType> sessionTypes, DefaultColumnSpec spec) {
        return sessionTypes.stream()
                .filter(sessionType -> matches(sessionType, spec))
                .min(Comparator.comparing(sessionType -> sessionType.getSortOrder() == null ? 0 : sessionType.getSortOrder()))
                .orElse(null);
    }

    private boolean matches(SessionType sessionType, DefaultColumnSpec spec) {
        String normalizedCode = normalize(sessionType.getCode());
        String normalizedName = normalize(sessionType.getDisplayName());
        return spec.normalizedCodes().contains(normalizedCode) || spec.normalizedSessionName().equals(normalizedName);
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace(" ", "").replace("_", "").toUpperCase(Locale.ROOT);
    }

    private static <T> T defaultIfNull(T value, T defaultValue) {
        return value == null ? defaultValue : value;
    }

    private record DefaultColumnSpec(String sessionName, List<String> codes) {
        private List<String> normalizedCodes() {
            return codes.stream()
                    .map(code -> code.replace(" ", "").replace("_", "").toUpperCase(Locale.ROOT))
                    .toList();
        }

        private String normalizedSessionName() {
            return sessionName.replace(" ", "").toUpperCase(Locale.ROOT);
        }
    }
}