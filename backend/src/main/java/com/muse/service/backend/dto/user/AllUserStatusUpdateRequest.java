package com.muse.service.backend.dto.user;

import com.muse.service.backend.entity.AllUser;
import jakarta.validation.constraints.NotNull;

public record AllUserStatusUpdateRequest(
        @NotNull AllUser.AllUserStatus status
) {
}
