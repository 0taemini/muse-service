package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerformanceSessionColumnUpsertRequest(
        Integer baseSessionTypeId,
        @NotBlank @Size(max = 50) String sessionName,
        Boolean isRequired,
        Integer displayOrder
) {
}
