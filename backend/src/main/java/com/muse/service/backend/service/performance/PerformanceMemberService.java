package com.muse.service.backend.service.performance;

import com.muse.service.backend.dto.performance.PerformanceMemberCreateRequest;
import com.muse.service.backend.dto.performance.PerformanceMemberResponse;
import java.util.List;

public interface PerformanceMemberService {

    List<PerformanceMemberResponse> getAll(Integer performanceId);

    PerformanceMemberResponse create(Integer performanceId, Integer userId, PerformanceMemberCreateRequest request);

    void delete(Integer performanceId, Integer userId, Integer memberUserId);
}
