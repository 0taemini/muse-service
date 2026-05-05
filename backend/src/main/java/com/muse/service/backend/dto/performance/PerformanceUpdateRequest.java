package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.Performance;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PerformanceUpdateRequest(
        @NotBlank @Size(max = 50) String title,
        @NotNull Performance.PerformanceStatus status
) {
}
