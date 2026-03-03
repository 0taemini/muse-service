package com.muse.service.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank String verificationToken,
        @Email String email,
        @NotBlank @Size(max = 255) String password,
        @NotBlank @Size(max = 30) String nickname
) {
}
