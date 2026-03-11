package com.muse.service.backend.dto.user;

import com.muse.service.backend.entity.User;
import java.time.LocalDateTime;

public record UserResponse(
        Integer userId,
        Integer allUserId,
        String name,
        Integer cohort,
        String email,
        String nickname,
        User.UserRank rank,
        User.UserStatus status,
        User.UserRole role,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getAllUser().getAllUserId(),
                user.getName(),
                user.getCohort(),
                user.getEmail(),
                user.getNickname(),
                user.getRank(),
                user.getStatus(),
                user.getRole(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
