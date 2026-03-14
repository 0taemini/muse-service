package com.muse.service.backend.service.seed;

import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSessionSource;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.SessionType;
import com.muse.service.backend.repository.PerformanceSessionColumnRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.SessionTypeRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionTypeSeedServiceImpl implements SessionTypeSeedService {

    private static final List<SessionTypeSeedSpec> DEFAULT_SESSION_TYPES = List.of(
            new SessionTypeSeedSpec("MALE_VOCAL", "남보컬", 1),
            new SessionTypeSeedSpec("FEMALE_VOCAL", "여보컬", 2),
            new SessionTypeSeedSpec("GUITAR1", "기타1", 3),
            new SessionTypeSeedSpec("GUITAR2", "기타2", 4),
            new SessionTypeSeedSpec("BASS", "베이스", 5),
            new SessionTypeSeedSpec("DRUM", "드럼", 6),
            new SessionTypeSeedSpec("SYNTH1", "신디1", 7)
    );

    private final SessionTypeRepository sessionTypeRepository;
    private final PerformanceSessionColumnRepository performanceSessionColumnRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;

    @Override
    @Transactional
    public RepairResult ensureDefaults() {
        Map<String, SessionType> sessionTypesByCode = new LinkedHashMap<>();
        for (SessionType sessionType : sessionTypeRepository.findAll()) {
            sessionTypesByCode.putIfAbsent(normalize(sessionType.getCode()), sessionType);
        }

        int insertedCount = 0;
        int updatedCount = 0;
        for (SessionTypeSeedSpec spec : DEFAULT_SESSION_TYPES) {
            String normalizedCode = normalize(spec.code());
            SessionType sessionType = sessionTypesByCode.get(normalizedCode);
            if (sessionType == null) {
                SessionType created = sessionTypeRepository.save(
                        SessionType.builder()
                                .code(spec.code())
                                .displayName(spec.displayName())
                                .sortOrder(spec.sortOrder())
                                .isDefault(Boolean.TRUE)
                                .isActive(Boolean.TRUE)
                                .build()
                );
                sessionTypesByCode.put(normalizedCode, created);
                insertedCount++;
                continue;
            }
            if (needsMetadataSync(sessionType, spec)) {
                sessionType.syncMetadata(spec.displayName(), spec.sortOrder(), Boolean.TRUE, Boolean.TRUE);
                updatedCount++;
            }
        }

        Map<String, SessionType> defaultSessionTypesByName = new LinkedHashMap<>();
        for (SessionTypeSeedSpec spec : DEFAULT_SESSION_TYPES) {
            SessionType sessionType = sessionTypesByCode.get(normalize(spec.code()));
            if (sessionType != null) {
                defaultSessionTypesByName.put(normalize(spec.displayName()), sessionType);
            }
        }

        int repairedColumnCount = repairDefaultColumns(defaultSessionTypesByName);
        int repairedSongSessionCount = repairDefaultSongSessions(defaultSessionTypesByName);
        return new RepairResult(insertedCount, updatedCount, repairedColumnCount, repairedSongSessionCount);
    }

    private int repairDefaultColumns(Map<String, SessionType> defaultSessionTypesByName) {
        int repairedCount = 0;
        for (PerformanceSessionColumn column : performanceSessionColumnRepository.findAll()) {
            if (column.getSessionSource() != PerformanceSessionSource.DEFAULT) {
                continue;
            }
            SessionType matchedSessionType = defaultSessionTypesByName.get(normalize(column.getSessionName()));
            if (matchedSessionType == null || hasSameId(column.getBaseSessionType(), matchedSessionType)) {
                continue;
            }
            column.updateStructure(
                    matchedSessionType,
                    column.getSessionName(),
                    column.getIsRequired(),
                    column.getDisplayOrder(),
                    PerformanceSessionSource.DEFAULT
            );
            repairedCount++;
        }
        return repairedCount;
    }

    private int repairDefaultSongSessions(Map<String, SessionType> defaultSessionTypesByName) {
        int repairedCount = 0;
        for (PerformanceSongSession session : performanceSongSessionRepository.findAll()) {
            if (session.getSessionSource() != PerformanceSessionSource.DEFAULT) {
                continue;
            }
            if (session.getPerformanceSessionColumn() != null) {
                SessionType columnSessionType = session.getPerformanceSessionColumn().getBaseSessionType();
                if (columnSessionType != null && !hasSameId(session.getBaseSessionType(), columnSessionType)) {
                    session.applyColumn(session.getPerformanceSessionColumn());
                    repairedCount++;
                }
                continue;
            }

            SessionType matchedSessionType = defaultSessionTypesByName.get(normalize(session.getSessionName()));
            if (matchedSessionType == null || hasSameId(session.getBaseSessionType(), matchedSessionType)) {
                continue;
            }
            session.syncBaseSessionType(matchedSessionType, session.getSessionName(), PerformanceSessionSource.DEFAULT);
            repairedCount++;
        }
        return repairedCount;
    }

    private boolean needsMetadataSync(SessionType sessionType, SessionTypeSeedSpec spec) {
        return !Objects.equals(sessionType.getDisplayName(), spec.displayName())
                || !Objects.equals(sessionType.getSortOrder(), spec.sortOrder())
                || !Boolean.TRUE.equals(sessionType.getIsDefault())
                || !Boolean.TRUE.equals(sessionType.getIsActive());
    }

    private boolean hasSameId(SessionType current, SessionType target) {
        if (current == null || target == null) {
            return false;
        }
        return Objects.equals(current.getSessionTypeId(), target.getSessionTypeId());
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace(" ", "").replace("_", "").toUpperCase(Locale.ROOT);
    }

    private record SessionTypeSeedSpec(String code, String displayName, Integer sortOrder) {
    }
}
