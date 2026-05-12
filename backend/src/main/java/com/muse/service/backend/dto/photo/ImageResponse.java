package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.ImageAsset;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ImageResponse(
        Integer imageId,
        ImageAsset.ImageType imageType,
        Integer albumId,
        String title,
        String description,
        LocalDate imageDate,
        Integer displayOrder,
        ImageAsset.ImageStatus status,
        String originalKey,
        Integer createdByUserId,
        String createdByNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<ImageVariantResponse> variants
) {

    public static ImageResponse from(ImageAsset image, List<ImageVariantResponse> variants) {
        return new ImageResponse(
                image.getImageId(),
                image.getImageType(),
                image.getAlbum() == null ? null : image.getAlbum().getAlbumId(),
                image.getTitle(),
                image.getDescription(),
                image.getImageDate(),
                image.getDisplayOrder(),
                image.getStatus(),
                image.getOriginalKey(),
                image.getCreatedBy().getUserId(),
                image.getCreatedBy().getNickname(),
                image.getCreatedAt(),
                image.getUpdatedAt(),
                variants
        );
    }
}
