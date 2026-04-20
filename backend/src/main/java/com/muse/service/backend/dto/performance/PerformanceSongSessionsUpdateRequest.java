package com.muse.service.backend.dto.performance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record PerformanceSongSessionsUpdateRequest(
        @NotEmpty @Valid List<PerformanceSongSessionAssignmentRequest> sessions
) {
}
