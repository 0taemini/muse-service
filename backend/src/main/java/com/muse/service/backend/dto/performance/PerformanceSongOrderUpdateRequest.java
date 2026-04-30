package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PerformanceSongOrderUpdateRequest(
        @NotNull(message = "곡 순서는 필수입니다.")
        @Positive(message = "곡 순서는 1 이상이어야 합니다.")
        Integer orderNo
) {
}
