package com.muse.service.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PhoneVerificationRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Integer cohort,
        @NotBlank
        @Size(max = 30)
        @Pattern(regexp = "^\\d{2,3}-?\\d{3,4}-?\\d{4}$", message = "전화번호 형식이 올바르지 않습니다.")
        String phone
) {
}
