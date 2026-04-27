package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceMemberResponse;
import com.muse.service.backend.dto.performance.PerformanceSongResponse;
import com.muse.service.backend.dto.performance.PerformanceSummaryResponse;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.PerformanceMemberRepository;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceServiceImpl implements PerformanceService {

    private final PerformanceRepository performanceRepository;
    private final PerformanceSongRepository performanceSongRepository;
    private final PerformanceMemberRepository performanceMemberRepository;

    @Override
    @Transactional
    public PerformanceDetailResponse create(PerformanceCreateRequest request) {
        Performance performance = performanceRepository.save(
                Performance.builder()
                        .title(request.title().trim())
                        .build()
        );

        return PerformanceDetailResponse.from(performance, Collections.emptyList(), Collections.emptyList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PerformanceSummaryResponse> getAll() {
        List<Performance> performances = performanceRepository.findAllByOrderByCreatedAtDesc();
        if (performances.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Integer, Long> songCounts = performanceSongRepository.countByPerformanceIds(
                        performances.stream()
                                .map(Performance::getPerformanceId)
                                .toList()
                ).stream()
                .collect(java.util.stream.Collectors.toMap(
                        PerformanceSongRepository.PerformanceSongCountProjection::getPerformanceId,
                        PerformanceSongRepository.PerformanceSongCountProjection::getSongCount
                ));

        return performances.stream()
                .map(performance -> PerformanceSummaryResponse.from(
                        performance,
                        songCounts.getOrDefault(performance.getPerformanceId(), 0L)
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PerformanceDetailResponse getById(Integer performanceId) {
        Performance performance = performanceRepository.findById(performanceId)
                .orElseThrow(() -> new CustomException(ErrorCode.PERFORMANCE_NOT_FOUND));

        List<PerformanceSongResponse> songs = performanceSongRepository.findAllActiveByPerformanceIdOrderByOrderNoAsc(
                        performanceId
                ).stream()
                .map(PerformanceSongResponse::from)
                .toList();

        List<PerformanceMemberResponse> members = performanceMemberRepository
                .findAllByPerformance_PerformanceIdOrderByCreatedAtAsc(performanceId)
                .stream()
                .map(PerformanceMemberResponse::from)
                .toList();

        return PerformanceDetailResponse.from(performance, songs, members);
    }
}
