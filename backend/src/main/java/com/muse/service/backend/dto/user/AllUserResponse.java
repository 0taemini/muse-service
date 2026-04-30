package com.muse.service.backend.dto.user;

import com.muse.service.backend.entity.AllUser;
import java.time.LocalDateTime;

public record AllUserResponse(
        Integer allUserId,
        String name,
        Integer cohort,
        String email,
        String phone,
        AllUser.AllUserStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AllUserResponse from(AllUser allUser) {
        return new AllUserResponse(
                allUser.getAllUserId(),
                allUser.getName(),
                allUser.getCohort(),
                allUser.getEmail(),
                allUser.getPhone(),
                allUser.getStatus(),
                allUser.getCreatedAt(),
                allUser.getUpdatedAt()
        );
    }
}
