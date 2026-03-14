package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerformanceCreateRequest(
        @NotBlank @Size(max = 50) String title
) {
}
