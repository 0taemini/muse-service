package com.muse.service.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Integer cohort,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Size(min = 6, max = 6) String verificationCode,
        @Email String email,
        @NotBlank @Size(max = 255) String password,
        @NotBlank @Size(max = 30) String nickname
) {
}
