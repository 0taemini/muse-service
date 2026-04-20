package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotNull;

public record PerformanceSongSessionAssignmentRequest(
        @NotNull Integer performanceSessionColumnId,
        Integer assignedUserId
) {
}
