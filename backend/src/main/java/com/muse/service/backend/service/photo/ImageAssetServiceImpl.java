package com.muse.service.backend.service.photo;

import com.muse.service.backend.dto.photo.ImageResponse;
import com.muse.service.backend.dto.photo.ImageUpdateRequest;
import com.muse.service.backend.dto.photo.ImageUploadRequest;
import com.muse.service.backend.dto.photo.ImageUploadResponse;
import com.muse.service.backend.dto.photo.ImageVariantRequest;
import com.muse.service.backend.config.storage.ImageStorageProperties;
import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.entity.ImageVariant;
import com.muse.service.backend.entity.PhotoAlbum;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ImageAssetRepository;
import com.muse.service.backend.repository.ImageVariantRepository;
import com.muse.service.backend.repository.PhotoAlbumRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ImageAssetServiceImpl implements ImageAssetService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final ImageAssetRepository imageAssetRepository;
    private final ImageVariantRepository imageVariantRepository;
    private final PhotoAlbumRepository photoAlbumRepository;
    private final UserRepository userRepository;
    private final ImageStorageService imageStorageService;
    private final ImageResponseMapper imageResponseMapper;
    private final ImageStorageProperties imageStorageProperties;

    @Override
    @Transactional
    public ImageUploadResponse createUpload(Integer userId, ImageUploadRequest request) {
        User user = findActiveUser(userId);
        validateContentType(request.contentType());
        validateFileSize(request.fileSizeBytes());
        validateUploadPolicy(user, request);

        PhotoAlbum album = null;
        if (request.imageType() == ImageAsset.ImageType.ALBUM) {
            album = findActiveAlbum(request.albumId());
        }

        ImageAsset image = imageAssetRepository.save(ImageAsset.builder()
                .imageType(request.imageType())
                .album(album)
                .title(trimToNull(request.title()))
                .description(trimToNull(request.description()))
                .imageDate(request.imageDate())
                .displayOrder(request.displayOrder())
                .originalKey(createPendingOriginalKey(request.imageType(), request.fileName(), request.contentType()))
                .originalContentType(request.contentType())
                .originalFileSize(request.fileSizeBytes())
                .createdBy(user)
                .build());

        String originalKey = createOriginalKey(
                request.imageType(),
                image.getImageId(),
                request.fileName(),
                request.contentType()
        );
        image.updateOriginalKey(originalKey);

        ImageStorageService.PresignedUpload presignedUpload = imageStorageService.createPresignedUpload(
                originalKey,
                request.contentType()
        );

        return new ImageUploadResponse(
                image.getImageId(),
                presignedUpload.uploadUrl(),
                originalKey,
                presignedUpload.expiresAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ImageResponse getImage(Integer imageId) {
        ImageAsset image = findActiveImage(imageId);
        return imageResponseMapper.toResponse(image, imageVariantRepository.findAllByImage_ImageId(imageId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ImageResponse> getImagesByType(ImageAsset.ImageType imageType) {
        if (imageType == ImageAsset.ImageType.MEMORY) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        List<ImageAsset> images = imageAssetRepository.findByTypeAndStatus(imageType, ImageAsset.ImageStatus.READY);
        return imageResponseMapper.toResponses(images, imageVariantRepository.findAllByImageIn(images));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ImageResponse> getMemories(LocalDate date, LocalDate startDate, LocalDate endDate) {
        List<ImageAsset> images;
        if (date != null) {
            images = imageAssetRepository.findMemoriesByDate(
                    ImageAsset.ImageType.MEMORY,
                    ImageAsset.ImageStatus.READY,
                    date
            );
        } else if (startDate != null && endDate != null) {
            images = imageAssetRepository.findMemoriesBetween(
                    ImageAsset.ImageType.MEMORY,
                    ImageAsset.ImageStatus.READY,
                    startDate,
                    endDate
            );
        } else {
            images = imageAssetRepository.findByTypeAndStatus(
                    ImageAsset.ImageType.MEMORY,
                    ImageAsset.ImageStatus.READY
            );
        }

        return imageResponseMapper.toResponses(images, imageVariantRepository.findAllByImageIn(images));
    }

    @Override
    @Transactional
    public ImageResponse update(Integer userId, Integer imageId, ImageUpdateRequest request) {
        User user = findActiveUser(userId);
        ImageAsset image = findActiveImage(imageId);
        ensureImageEditable(user, image);
        validateUpdatePolicy(image, request);

        image.updateDetails(
                trimToNull(request.title()),
                trimToNull(request.description()),
                request.imageDate(),
                request.displayOrder()
        );

        return imageResponseMapper.toResponse(image, imageVariantRepository.findAllByImage_ImageId(imageId));
    }

    @Override
    @Transactional
    public ImageResponse upsertVariant(Integer imageId, ImageVariantRequest request) {
        ImageAsset image = findActiveImage(imageId);
        validateVariantPolicy(image, request);
        ImageVariant variant = imageVariantRepository
                .findByImage_ImageIdAndVariantType(imageId, request.variantType())
                .map(existing -> {
                    existing.updateFile(
                            request.s3Key(),
                            request.width(),
                            request.height(),
                            request.contentType()
                    );
                    return existing;
                })
                .orElseGet(() -> imageVariantRepository.save(ImageVariant.builder()
                        .image(image)
                        .variantType(request.variantType())
                        .s3Key(request.s3Key())
                        .width(request.width())
                        .height(request.height())
                        .contentType(request.contentType())
                        .build()));

        if (hasRequiredVariants(image)) {
            image.markReady();
        }

        List<ImageVariant> variants = imageVariantRepository.findAllByImage_ImageId(imageId);
        if (variants.stream().noneMatch(saved -> saved.getImageVariantId().equals(variant.getImageVariantId()))) {
            variants = imageVariantRepository.findAllByImage_ImageId(imageId);
        }
        return imageResponseMapper.toResponse(image, variants);
    }

    @Override
    @Transactional
    public void markFailed(Integer imageId) {
        ImageAsset image = findActiveImage(imageId);
        image.markFailed();
    }

    @Override
    @Transactional
    public void delete(Integer userId, Integer imageId) {
        User user = findActiveUser(userId);
        ImageAsset image = findActiveImage(imageId);
        ensureImageEditable(user, image);
        image.markDeleted();
    }

    private void validateUploadPolicy(User user, ImageUploadRequest request) {
        if (request.imageType() == ImageAsset.ImageType.POSTER && user.getRole() != User.UserRole.ADMIN) {
            throw new CustomException(ErrorCode.IMAGE_POSTER_ADMIN_ONLY);
        }

        if (request.imageType() == ImageAsset.ImageType.POSTER && trimToNull(request.title()) == null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        if (request.imageType() == ImageAsset.ImageType.MEMORY && request.imageDate() == null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        if (request.imageType() == ImageAsset.ImageType.ALBUM && request.albumId() == null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        if (request.imageType() != ImageAsset.ImageType.ALBUM && request.albumId() != null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }
    }

    private void validateUpdatePolicy(ImageAsset image, ImageUpdateRequest request) {
        if (image.getImageType() == ImageAsset.ImageType.POSTER && trimToNull(request.title()) == null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        if (image.getImageType() == ImageAsset.ImageType.MEMORY && request.imageDate() == null) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }
    }

    private void ensureImageEditable(User user, ImageAsset image) {
        if (image.getImageType() == ImageAsset.ImageType.POSTER && user.getRole() != User.UserRole.ADMIN) {
            throw new CustomException(ErrorCode.IMAGE_POSTER_ADMIN_ONLY);
        }

        if (user.getRole() == User.UserRole.ADMIN) {
            return;
        }

        if (!image.getCreatedBy().getUserId().equals(user.getUserId())) {
            throw new CustomException(ErrorCode.IMAGE_ACCESS_DENIED);
        }
    }

    private boolean hasRequiredVariants(ImageAsset image) {
        Set<ImageVariant.VariantType> savedTypes = imageVariantRepository.findAllByImage_ImageId(image.getImageId())
                .stream()
                .map(ImageVariant::getVariantType)
                .collect(Collectors.toSet());
        return savedTypes.containsAll(requiredVariants(image.getImageType()));
    }

    private Set<ImageVariant.VariantType> requiredVariants(ImageAsset.ImageType imageType) {
        if (imageType == ImageAsset.ImageType.POSTER) {
            return EnumSet.of(ImageVariant.VariantType.THUMB_480, ImageVariant.VariantType.POSTER_1600);
        }

        return EnumSet.of(
                ImageVariant.VariantType.THUMB_320,
                ImageVariant.VariantType.THUMB_480,
                ImageVariant.VariantType.DETAIL_1200
        );
    }

    private ImageAsset findActiveImage(Integer imageId) {
        return imageAssetRepository.findActiveById(imageId)
                .orElseThrow(() -> new CustomException(ErrorCode.IMAGE_NOT_FOUND));
    }

    private PhotoAlbum findActiveAlbum(Integer albumId) {
        return photoAlbumRepository.findActiveById(albumId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_ALBUM_NOT_FOUND));
    }

    private User findActiveUser(Integer userId) {
        return userRepository.findByUserIdAndStatus(userId, User.UserStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateContentType(String contentType) {
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_CONTENT_TYPE);
        }
    }

    private void validateFileSize(Long fileSizeBytes) {
        if (fileSizeBytes != null && fileSizeBytes > imageStorageProperties.maxUploadSizeBytes()) {
            throw new CustomException(ErrorCode.IMAGE_FILE_TOO_LARGE);
        }
    }

    private void validateVariantPolicy(ImageAsset image, ImageVariantRequest request) {
        if (!requiredVariants(image.getImageType()).contains(request.variantType())) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }

        if (!"image/webp".equalsIgnoreCase(request.contentType())) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_CONTENT_TYPE);
        }

        String expectedPrefix = "resized/%s/%d/".formatted(
                image.getImageType().name().toLowerCase(Locale.ROOT),
                image.getImageId()
        );
        if (request.s3Key() == null || !request.s3Key().startsWith(expectedPrefix) || !request.s3Key().endsWith(".webp")) {
            throw new CustomException(ErrorCode.IMAGE_INVALID_TYPE_POLICY);
        }
    }

    private String createPendingOriginalKey(ImageAsset.ImageType imageType, String fileName, String contentType) {
        String extension = extensionFromContentType(contentType);
        if (extension == null) {
            extension = extensionFromFileName(fileName);
        }

        return "original/%s/pending/%s.%s".formatted(
                imageType.name().toLowerCase(Locale.ROOT),
                UUID.randomUUID(),
                extension
        );
    }

    private String createOriginalKey(
            ImageAsset.ImageType imageType,
            Integer imageId,
            String fileName,
            String contentType
    ) {
        String extension = extensionFromContentType(contentType);
        if (extension == null) {
            extension = extensionFromFileName(fileName);
        }

        return "original/%s/%d/%s.%s".formatted(
                imageType.name().toLowerCase(Locale.ROOT),
                imageId,
                UUID.randomUUID(),
                extension
        );
    }

    private String extensionFromContentType(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> null;
        };
    }

    private String extensionFromFileName(String fileName) {
        int dotIndex = fileName == null ? -1 : fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "jpg";
        }
        String extension = fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (extension.equals("jpeg")) {
            return "jpg";
        }
        return extension;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
