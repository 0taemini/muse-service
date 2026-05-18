package com.muse.service.backend.service.photo;

import com.muse.service.backend.dto.photo.ImageResponse;
import com.muse.service.backend.dto.photo.ImageVariantResponse;
import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.entity.ImageVariant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ImageResponseMapper {

    private final ImageStorageService imageStorageService;

    public ImageResponseMapper(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    public ImageResponse toResponse(ImageAsset image, List<ImageVariant> variants) {
        return ImageResponse.from(image, variants.stream()
                .map(variant -> ImageVariantResponse.from(variant, imageStorageService.publicUrl(variant.getS3Key())))
                .toList());
    }

    public List<ImageResponse> toResponses(List<ImageAsset> images, List<ImageVariant> variants) {
        Map<Integer, List<ImageVariant>> variantsByImageId = variants.stream()
                .collect(Collectors.groupingBy(variant -> variant.getImage().getImageId()));

        return images.stream()
                .map(image -> toResponse(image, variantsByImageId.getOrDefault(image.getImageId(), List.of())))
                .toList();
    }
}
