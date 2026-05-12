package com.muse.service.backend.service.photo;

import com.muse.service.backend.config.storage.ImageStorageProperties;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.S3Presigner.Builder;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class S3ImageStorageService implements ImageStorageService {

    private final ImageStorageProperties properties;

    @Override
    public PresignedUpload createPresignedUpload(String objectKey, String contentType) {
        ensureConfigured();

        Duration expiration = Duration.ofMinutes(properties.presignedPutExpirationMinutes());
        try (S3Presigner presigner = presigner()) {
            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(objectKey)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(expiration)
                    .putObjectRequest(objectRequest)
                    .build();

            PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
            return new PresignedUpload(
                    presignedRequest.url().toString(),
                    LocalDateTime.now().plus(expiration)
            );
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }

        String cloudfrontDomain = properties.cloudfrontDomain();
        if (cloudfrontDomain != null && !cloudfrontDomain.isBlank()) {
            String domain = cloudfrontDomain.endsWith("/")
                    ? cloudfrontDomain.substring(0, cloudfrontDomain.length() - 1)
                    : cloudfrontDomain;
            return domain + "/" + objectKey;
        }

        if (properties.bucket() == null || properties.bucket().isBlank()) {
            return objectKey;
        }

        return URI.create("https://" + properties.bucket() + ".s3." + properties.region() + ".amazonaws.com/")
                .resolve(objectKey)
                .toString();
    }

    private void ensureConfigured() {
        if (properties.bucket() == null || properties.bucket().isBlank()) {
            throw new CustomException(ErrorCode.IMAGE_STORAGE_NOT_CONFIGURED);
        }
    }

    private S3Presigner presigner() {
        Builder builder = S3Presigner.builder()
                .region(Region.of(properties.region()));

        if (hasStaticCredentials()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.accessKeyId(), properties.secretAccessKey())
            ));
        }

        return builder.build();
    }

    private boolean hasStaticCredentials() {
        return properties.accessKeyId() != null
                && !properties.accessKeyId().isBlank()
                && properties.secretAccessKey() != null
                && !properties.secretAccessKey().isBlank();
    }
}
