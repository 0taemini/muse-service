package com.muse.service.backend.config.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "muse.image.storage")
public record ImageStorageProperties(
        String bucket,
        String region,
        String cloudfrontDomain,
        long presignedPutExpirationMinutes,
        String lambdaCallbackToken,
        String accessKeyId,
        String secretAccessKey,
        long maxUploadSizeBytes
) {

    public ImageStorageProperties {
        if (region == null || region.isBlank()) {
            region = "ap-northeast-2";
        }
        if (presignedPutExpirationMinutes <= 0) {
            presignedPutExpirationMinutes = 10;
        }
        if (maxUploadSizeBytes <= 0) {
            maxUploadSizeBytes = 20L * 1024L * 1024L;
        }
    }
}
