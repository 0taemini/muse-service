package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceMemberCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceMemberResponse;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceMember;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongSessionRepository;
import com.muse.service.backend.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceMemberServiceImpl implements PerformanceMemberService {

    private final PerformanceRepository performanceRepository;
    private final PerformanceMemberRepository performanceMemberRepository;
    private final PerformanceSongSessionRepository performanceSongSessionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PerformanceMemberResponse> getAll(Integer performanceId) {
        findPerformance(performanceId);
        return performanceMemberRepository.findAllByPerformance_PerformanceIdOrderByCreatedAtAsc(performanceId).stream()
                .map(PerformanceMemberResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public PerformanceMemberResponse create(Integer performanceId, Integer userId, PerformanceMemberCreateRequest request) {
        findUser(userId);
        Performance performance = findPerformance(performanceId);
        User memberUser = findUser(request.userId());

        if (performanceMemberRepository.existsByPerformance_PerformanceIdAndUser_UserId(performanceId, request.userId())) {
            throw new CustomException(ErrorCode.DATA_CONFLICT);
        }

        PerformanceMember performanceMember = performanceMemberRepository.save(
                PerformanceMember.builder()
                        .performance(performance)
                        .user(memberUser)
                        .build()
        );

        return PerformanceMemberResponse.from(performanceMember);
    }

    @Override
    @Transactional
    public void delete(Integer performanceId, Integer userId, Integer memberUserId) {
        findUser(userId);
        PerformanceMember performanceMember = performanceMemberRepository
                .findByPerformance_PerformanceIdAndUser_UserId(performanceId, memberUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.DATA_CONFLICT));

        performanceSongSessionRepository
                .findAllByPerformanceSong_Performance_PerformanceIdAndAssignedUser_UserId(performanceId, memberUserId)
                .forEach(session -> session.assignUser(null));

        performanceMemberRepository.delete(performanceMember);
    }

    private Performance findPerformance(Integer performanceId) {
        return performanceRepository.findById(performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_NOT_FOUND));
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
