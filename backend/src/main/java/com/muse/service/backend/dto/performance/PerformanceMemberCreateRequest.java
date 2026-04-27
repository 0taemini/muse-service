package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotNull;

public record PerformanceMemberCreateRequest(
        @NotNull Integer userId
) {
}
