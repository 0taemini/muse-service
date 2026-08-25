package com.muse.service.backend.dto.sms;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BulkSmsSendRequest(
        List<Integer> cohorts,
        List<Integer> allUserIds,
        @NotBlank @Size(max = 2000) String message
) {
}