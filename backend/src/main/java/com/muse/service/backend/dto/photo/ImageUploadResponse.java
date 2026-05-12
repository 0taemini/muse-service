package com.muse.service.backend.dto.photo;

import java.time.LocalDateTime;

public record ImageUploadResponse(
        Integer imageId,
        String uploadUrl,
        String originalKey,
        LocalDateTime expiresAt
) {
}
