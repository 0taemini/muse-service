package com.muse.service.backend.dto.user;

import com.muse.service.backend.entity.User;
import jakarta.validation.constraints.NotNull;

public record UserStatusUpdateRequest(
        @NotNull User.UserStatus status
) {
}
