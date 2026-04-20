package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSong;
import jakarta.validation.constraints.NotNull;

public record PerformanceSongStatusUpdateRequest(
        @NotNull PerformanceSong.SelectionStatus selectionStatus
) {
}
