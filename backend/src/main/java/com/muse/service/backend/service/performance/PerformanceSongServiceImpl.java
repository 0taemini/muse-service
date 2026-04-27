package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceSongCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSongSessionAssignmentRequest;
import com.muse.service.backend.dto.performance.PerformanceSongSessionResponse;
import com.muse.service.backend.dto.performance.PerformanceSongSessionsUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongStatusUpdateRequest;
import com.muse.service.backend.dto.performance.PerformanceSongUpdateRequest;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSessionColumn;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.entity.PerformanceSongSession;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ChatRoomRepository;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSessionColumnRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceSongServiceImpl implements PerformanceSongService {

    private final PerformanceRepository performanceRepository;
    private final PerformanceMemberRepository performanceMemberRepository;
    private final PerformanceSongRepository performanceSongRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
    private final PerformanceSessionColumnRepository performanceSessionColumnRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final PerformanceSessionColumnService performanceSessionColumnService;


    @Override
    @Transactional
    public PerformanceSongDetailResponse create(Integer performanceId, Integer userId, PerformanceSongCreateRequest request) {
        Performance performance = findPerformance(performanceId);
        User user = findUser(userId);

        Integer orderNo = request.orderNo() != null
                ? request.orderNo()
                : performanceSongRepository.findMaxOrderNoByPerformanceId(performanceId) + 1;

        PerformanceSong performanceSong = performanceSongRepository.save(
                PerformanceSong.builder()
                        .performance(performance)
                        .songTitle(request.songTitle().trim())
                        .singer(request.singer().trim())
                        .isSheet(request.isSheet())
                        .orderNo(orderNo)
                        .selectionStatus(request.selectionStatus())
                        .createdByUser(user)
                        .build()
        );

        List<PerformanceSongSession> sessions = createInitialSessions(
                performanceSong,
                performanceSessionColumnService.ensureDefaultColumns(performanceId)
        );
        return toDetailResponse(performanceSong, sessions);
    }

    @Override
    @Transactional(readOnly = true)
    public PerformanceSongDetailResponse getById(Integer performanceId, Integer performanceSongId) {
        PerformanceSong performanceSong = findPerformanceSong(performanceId, performanceSongId);
        return toDetailResponse(
                performanceSong,
                performanceSongSessionRepository.findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(performanceSongId)
        );
    }

    @Override
    @Transactional
    public PerformanceSongDetailResponse update(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongUpdateRequest request
    ) {
        PerformanceSong performanceSong = findActivePerformanceSong(performanceId, performanceSongId);
        ensureAuthor(performanceSong, userId);
        ensureNoChatRoom(performanceSongId);

        performanceSong.updateDetails(
                request.songTitle().trim(),
                request.singer().trim(),
                request.isSheet(),
                request.orderNo()
        );

        return toDetailResponse(
                performanceSong,
                performanceSongSessionRepository.findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(performanceSongId)
        );
    }

    @Override
    @Transactional
    public PerformanceSongDetailResponse updateStatus(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongStatusUpdateRequest request
    ) {
        findUser(userId);
        PerformanceSong performanceSong = findActivePerformanceSong(performanceId, performanceSongId);
        performanceSong.changeSelectionStatus(request.selectionStatus());

        return toDetailResponse(
                performanceSong,
                performanceSongSessionRepository.findAllByPerformanceSong_PerformanceSongIdOrderByDisplayOrderAsc(performanceSongId)
        );
    }

    @Override
    @Transactional
    public PerformanceSongDetailResponse updateSessions(
            Integer performanceId,
            Integer performanceSongId,
            Integer userId,
            PerformanceSongSessionsUpdateRequest request
    ) {
        PerformanceSong performanceSong = findActivePerformanceSong(performanceId, performanceSongId);
        ensureAuthor(performanceSong, userId);

        List<PerformanceSongSession> updatedSessions = new ArrayList<>();
        for (PerformanceSongSessionAssignmentRequest sessionRequest : request.sessions()) {
            PerformanceSessionColumn sessionColumn = findPerformanceSessionColumn(
                    performanceId,
                    sessionRequest.performanceSessionColumnId()
            );
            User assignedUser = sessionRequest.assignedUserId() == null
                    ? null
                    : findPerformanceMemberUser(performanceId, sessionRequest.assignedUserId());

            PerformanceSongSession session = performanceSongSessionRepository
                    .findByPerformanceSong_PerformanceSongIdAndPerformanceSessionColumn_PerformanceSessionColumnId(
                            performanceSongId,
                            sessionColumn.getPerformanceSessionColumnId()
                    )
                    .orElseGet(() -> performanceSongSessionRepository.save(
                            PerformanceSongSession.builder()
                                    .performanceSong(performanceSong)
                                    .performanceSessionColumn(sessionColumn)
                                    .baseSessionType(sessionColumn.getBaseSessionType())
                                    .sessionName(sessionColumn.getSessionName())
                                    .isRequired(sessionColumn.getIsRequired())
                                    .displayOrder(sessionColumn.getDisplayOrder())
                                    .assignedUser(null)
                                    .sessionSource(sessionColumn.getSessionSource())
                                    .build()
                    ));

            session.applyColumn(sessionColumn);
            session.assignUser(assignedUser);
            updatedSessions.add(session);
        }

        updatedSessions.sort(Comparator.comparing(PerformanceSongSession::getDisplayOrder));
        return toDetailResponse(performanceSong, updatedSessions);
    }

    @Override
    @Transactional
    public void delete(Integer performanceId, Integer performanceSongId, Integer userId) {
        PerformanceSong performanceSong = findActivePerformanceSong(performanceId, performanceSongId);
        ensureAuthor(performanceSong, userId);
        ensureNoChatRoom(performanceSongId);
        performanceSong.softDelete(findUser(userId));
    }

    private List<PerformanceSongSession> createInitialSessions(
            PerformanceSong performanceSong,
            List<PerformanceSessionColumn> sessionColumns
    ) {
        return sessionColumns.stream()
                .map(sessionColumn -> performanceSongSessionRepository.save(
                        PerformanceSongSession.builder()
                                .performanceSong(performanceSong)
                                .performanceSessionColumn(sessionColumn)
                                .baseSessionType(sessionColumn.getBaseSessionType())
                                .sessionName(sessionColumn.getSessionName())
                                .isRequired(sessionColumn.getIsRequired())
                                .displayOrder(sessionColumn.getDisplayOrder())
                                .assignedUser(null)
                                .sessionSource(sessionColumn.getSessionSource())
                                .build()
                ))
                .sorted(Comparator.comparing(PerformanceSongSession::getDisplayOrder))
                .toList();
    }

    private Performance findPerformance(Integer performanceId) {
        return performanceRepository.findById(performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_NOT_FOUND));
    }

    private PerformanceSong findPerformanceSong(Integer performanceId, Integer performanceSongId) {
        findPerformance(performanceId);
        return performanceSongRepository.findByPerformanceSongIdAndPerformance_PerformanceId(performanceSongId, performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_SONG_NOT_FOUND));
    }

    private PerformanceSong findActivePerformanceSong(Integer performanceId, Integer performanceSongId) {
        PerformanceSong performanceSong = findPerformanceSong(performanceId, performanceSongId);
        if (Boolean.TRUE.equals(performanceSong.getIsDeleted())) {
            throw new CustomException(ErrorCode.PERFORMANCE_SONG_ALREADY_DELETED);
        }
        return performanceSong;
    }

    private PerformanceSessionColumn findPerformanceSessionColumn(Integer performanceId, Integer performanceSessionColumnId) {
        return performanceSessionColumnRepository
                .findByPerformanceSessionColumnIdAndPerformance_PerformanceId(
                        performanceSessionColumnId,
                        performanceId
                )
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_SESSION_COLUMN_NOT_FOUND));
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private User findPerformanceMemberUser(Integer performanceId, Integer userId) {
        User user = findUser(userId);
        if (!performanceMemberRepository.existsByPerformance_PerformanceIdAndUser_UserId(performanceId, userId)) {
            throw new CustomException(ErrorCode.DATA_CONFLICT);
        }
        return user;
    }

    private void ensureAuthor(PerformanceSong performanceSong, Integer userId) {
        if (performanceSong.getCreatedByUser() == null || !performanceSong.getCreatedByUser().getUserId().equals(userId)) {
            throw new CustomException(ErrorCode.PERFORMANCE_SONG_ACCESS_DENIED);
        }
    }

    private void ensureNoChatRoom(Integer performanceSongId) {
        if (chatRoomRepository.existsByPerformanceSong_PerformanceSongId(performanceSongId)) {
            throw new CustomException(ErrorCode.PERFORMANCE_SONG_LOCKED);
        }
    }

    private PerformanceSongDetailResponse toDetailResponse(
            PerformanceSong performanceSong,
            List<PerformanceSongSession> sessions
    ) {
        return PerformanceSongDetailResponse.from(
                performanceSong,
                chatRoomRepository.existsByPerformanceSong_PerformanceSongId(performanceSong.getPerformanceSongId()),
                sessions.stream()
                        .sorted(Comparator.comparing(PerformanceSongSession::getDisplayOrder))
                        .map(PerformanceSongSessionResponse::from)
                        .toList()
        );
    }
}
