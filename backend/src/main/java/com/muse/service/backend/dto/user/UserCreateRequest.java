package com.muse.service.backend.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotNull Integer allUserId,
        @Email String email,
        @NotBlank @Size(max = 255) String password,
        @NotBlank @Size(max = 30) String nickname
) {
}
