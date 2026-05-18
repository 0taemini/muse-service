package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.PhotoAlbum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhotoAlbumRequest(
        PhotoAlbum.AlbumCategory albumCategory,
        @NotBlank(message = "앨범 제목을 입력해주세요.")
        @Size(max = 100, message = "앨범 제목은 100자 이하로 입력해주세요.")
        String title,
        String description,
        Integer displayOrder
) {
}
