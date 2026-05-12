package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.ImageAsset;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ImageUploadRequest(
        @NotNull(message = "이미지 타입을 선택해주세요.")
        ImageAsset.ImageType imageType,
        Integer albumId,
        @Size(max = 100, message = "제목은 100자 이하로 입력해주세요.")
        String title,
        String description,
        LocalDate imageDate,
        Integer displayOrder,
        @NotBlank(message = "파일명을 입력해주세요.")
        String fileName,
        @NotBlank(message = "이미지 Content-Type을 입력해주세요.")
        String contentType,
        @Min(value = 1, message = "파일 크기는 1바이트 이상이어야 합니다.")
        Long fileSizeBytes
) {
}
