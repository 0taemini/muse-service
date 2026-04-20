package com.muse.service.backend.dto.performance;

import com.muse.service.backend.entity.PerformanceSong;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerformanceSongCreateRequest(
        @NotBlank @Size(max = 200) String songTitle,
        @NotBlank @Size(max = 50) String singer,
        Boolean isSheet,
        Integer orderNo,
        PerformanceSong.SelectionStatus selectionStatus
) {
}
