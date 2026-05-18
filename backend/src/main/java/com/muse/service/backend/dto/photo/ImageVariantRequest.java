package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.ImageVariant;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ImageVariantRequest(
        @NotNull(message = "이미지 변환 타입을 선택해주세요.")
        ImageVariant.VariantType variantType,
        @NotBlank(message = "S3 key를 입력해주세요.")
        String s3Key,
        Integer width,
        Integer height,
        @NotBlank(message = "Content-Type을 입력해주세요.")
        String contentType
) {
}
