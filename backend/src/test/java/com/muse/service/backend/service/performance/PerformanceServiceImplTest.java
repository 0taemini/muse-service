package com.muse.service.backend.service.performance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.muse.service.backend.dto.performance.PerformanceCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSummaryResponse;
import com.muse.service.backend.entity.Performance;
import com.muse.service.backend.entity.PerformanceSong;
import com.muse.service.backend.global.exception.PerformanceNotFoundException;
import com.muse.service.backend.repository.PerformanceRepository;
import com.muse.service.backend.repository.PerformanceSongRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PerformanceServiceImplTest {

    @Mock
    private PerformanceRepository performanceRepository;

    @Mock
    private PerformanceSongRepository performanceSongRepository;

    private PerformanceServiceImpl performanceService;

    @BeforeEach
    void setUp() {
        performanceService = new PerformanceServiceImpl(performanceRepository, performanceSongRepository);
    }

    @Test
    void create_returnsCreatedPerformanceWithEmptySongList() {
        Performance savedPerformance = performance(1, "Spring Concert", LocalDateTime.of(2026, 3, 11, 10, 0));
        when(performanceRepository.save(org.mockito.ArgumentMatchers.any(Performance.class))).thenReturn(savedPerformance);

        PerformanceDetailResponse response = performanceService.create(new PerformanceCreateRequest("  Spring Concert  "));

        assertThat(response.performanceId()).isEqualTo(1);
        assertThat(response.title()).isEqualTo("Spring Concert");
        assertThat(response.songCount()).isZero();
        assertThat(response.songs()).isEmpty();
    }

    @Test
    void getAll_returnsSongCountsPerPerformance() {
        Performance latestPerformance = performance(2, "Summer Stage", LocalDateTime.of(2026, 3, 11, 11, 0));
        Performance oldPerformance = performance(1, "Spring Concert", LocalDateTime.of(2026, 3, 10, 11, 0));

        when(performanceRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(latestPerformance, oldPerformance));
        when(performanceSongRepository.countByPerformanceIds(List.of(2, 1))).thenReturn(List.of(
                countProjection(2, 3L),
                countProjection(1, 1L)
        ));

        List<PerformanceSummaryResponse> response = performanceService.getAll();

        assertThat(response).hasSize(2);
        assertThat(response.get(0).performanceId()).isEqualTo(2);
        assertThat(response.get(0).songCount()).isEqualTo(3L);
        assertThat(response.get(1).performanceId()).isEqualTo(1);
        assertThat(response.get(1).songCount()).isEqualTo(1L);
    }

    @Test
    void getById_returnsSongsOrderedByOrderNo() {
        Performance performance = performance(1, "Spring Concert", LocalDateTime.of(2026, 3, 11, 10, 0));
        PerformanceSong firstSong = performanceSong(11, performance, "Song A", "Singer A", 1);
        PerformanceSong secondSong = performanceSong(12, performance, "Song B", "Singer B", 2);

        when(performanceRepository.findById(1)).thenReturn(java.util.Optional.of(performance));
        when(performanceSongRepository.findAllActiveByPerformanceIdOrderByOrderNoAsc(1))
                .thenReturn(List.of(firstSong, secondSong));

        PerformanceDetailResponse response = performanceService.getById(1);

        assertThat(response.performanceId()).isEqualTo(1);
        assertThat(response.songCount()).isEqualTo(2);
        assertThat(response.songs()).hasSize(2);
        assertThat(response.songs().get(0).songTitle()).isEqualTo("Song A");
        assertThat(response.songs().get(1).songTitle()).isEqualTo("Song B");
    }

    @Test
    void getById_whenPerformanceMissing_throwsPerformanceNotFoundException() {
        when(performanceRepository.findById(999)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> performanceService.getById(999))
                .isInstanceOf(PerformanceNotFoundException.class)
                .hasMessage("공연을 찾을 수 없습니다.");
    }

    private Performance performance(Integer id, String title, LocalDateTime createdAt) {
        Performance performance = Performance.builder()
                .title(title)
                .build();
        ReflectionTestUtils.setField(performance, "performanceId", id);
        ReflectionTestUtils.setField(performance, "createdAt", createdAt);
        return performance;
    }

    private PerformanceSong performanceSong(Integer id, Performance performance, String title, String singer, Integer orderNo) {
        PerformanceSong performanceSong = PerformanceSong.builder()
                .performance(performance)
                .songTitle(title)
                .singer(singer)
                .isSheet(Boolean.FALSE)
                .orderNo(orderNo)
                .selectionStatus(PerformanceSong.SelectionStatus.CONFIRMED)
                .build();
        ReflectionTestUtils.setField(performanceSong, "performanceSongId", id);
        ReflectionTestUtils.setField(performanceSong, "isDeleted", Boolean.FALSE);
        return performanceSong;
    }

    private PerformanceSongRepository.PerformanceSongCountProjection countProjection(Integer performanceId, long songCount) {
        return new PerformanceSongRepository.PerformanceSongCountProjection() {
            @Override
            public Integer getPerformanceId() {
                return performanceId;
            }

            @Override
            public long getSongCount() {
                return songCount;
            }
        };
    }
}
