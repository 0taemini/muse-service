package com.muse.service.backend.service.photo;

import java.time.LocalDateTime;

public interface ImageStorageService {

    PresignedUpload createPresignedUpload(String objectKey, String contentType);

    String publicUrl(String objectKey);

    record PresignedUpload(String uploadUrl, LocalDateTime expiresAt) {
    }
}
