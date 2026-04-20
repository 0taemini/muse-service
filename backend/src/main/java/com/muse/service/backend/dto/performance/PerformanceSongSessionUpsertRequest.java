package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerformanceSongSessionUpsertRequest(
        Integer performanceSongSessionId,
        Integer baseSessionTypeId,
        @NotBlank @Size(max = 50) String sessionName,
        Boolean isRequired,
        Integer displayOrder,
        Integer assignedUserId
) {
}
