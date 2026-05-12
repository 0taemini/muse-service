package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.ImageVariant;

public record ImageVariantResponse(
        ImageVariant.VariantType variantType,
        String s3Key,
        String url,
        Integer width,
        Integer height,
        String contentType
) {

    public static ImageVariantResponse from(ImageVariant variant, String url) {
        return new ImageVariantResponse(
                variant.getVariantType(),
                variant.getS3Key(),
                url,
                variant.getWidth(),
                variant.getHeight(),
                variant.getContentType()
        );
    }
}
