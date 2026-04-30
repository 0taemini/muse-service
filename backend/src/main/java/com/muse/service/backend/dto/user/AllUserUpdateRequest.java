package com.muse.service.backend.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AllUserUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Integer cohort,
        @Email @Size(max = 255) String email,
        @Size(max = 30) String phone
) {
}
