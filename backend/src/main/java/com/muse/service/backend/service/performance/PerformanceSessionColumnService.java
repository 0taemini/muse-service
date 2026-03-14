package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceSessionColumnResponse;
import com.muse.service.backend.dto.performance.PerformanceSessionColumnUpsertRequest;
import com.muse.service.backend.entity.PerformanceSessionColumn;
import java.util.List;

public interface PerformanceSessionColumnService {

    List<PerformanceSessionColumnResponse> getAll(Integer performanceId);

    PerformanceSessionColumnResponse create(
            Integer performanceId,
            Integer userId,
            PerformanceSessionColumnUpsertRequest request
    );

    PerformanceSessionColumnResponse update(
            Integer performanceId,
            Integer performanceSessionColumnId,
            Integer userId,
            PerformanceSessionColumnUpsertRequest request
    );

    List<PerformanceSessionColumn> ensureDefaultColumns(Integer performanceId);
}
