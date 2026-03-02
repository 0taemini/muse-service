package com.muse.service.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PhoneVerificationRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Integer cohort,
        @NotBlank @Size(max = 30) String phone
) {
}
