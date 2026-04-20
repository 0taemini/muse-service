package com.muse.service.backend.dto.performance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PerformanceSongUpdateRequest(
        @NotBlank @Size(max = 200) String songTitle,
        @NotBlank @Size(max = 50) String singer,
        @NotNull Boolean isSheet,
        @NotNull Integer orderNo
) {
}
