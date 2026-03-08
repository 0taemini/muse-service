package com.muse.service.backend.dto.user;

import com.muse.service.backend.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @Email String email,
        User.UserRank rank,
        @Size(min = 8, max = 255) String password,
        @Min(1) Integer cohort
) {
}
