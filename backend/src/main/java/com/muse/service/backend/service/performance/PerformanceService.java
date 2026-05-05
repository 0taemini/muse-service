package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceDetailResponse;
import com.muse.service.backend.dto.performance.PerformanceSummaryResponse;
import com.muse.service.backend.dto.performance.PerformanceUpdateRequest;
import java.util.List;

public interface PerformanceService {

    PerformanceDetailResponse create(PerformanceCreateRequest request);

    PerformanceDetailResponse update(Integer performanceId, PerformanceUpdateRequest request);

    List<PerformanceSummaryResponse> getAll();

    PerformanceDetailResponse getById(Integer performanceId);
}
