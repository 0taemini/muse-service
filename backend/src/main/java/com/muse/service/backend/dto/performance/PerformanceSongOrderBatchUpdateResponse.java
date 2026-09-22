package com.muse.service.backend.dto.performance;

import java.util.List;

public record PerformanceSongOrderBatchUpdateResponse(
        Long songOrderVersion,
        List<PerformanceSongResponse> songs
) {
}
