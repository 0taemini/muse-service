package com.muse.service.backend.dto.photo;

import com.muse.service.backend.entity.PhotoAlbum;
import java.time.LocalDateTime;

public record PhotoAlbumResponse(
        Integer albumId,
        PhotoAlbum.AlbumCategory albumCategory,
        String title,
        String description,
        Integer displayOrder,
        Integer createdByUserId,
        String createdByNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static PhotoAlbumResponse from(PhotoAlbum album) {
        return new PhotoAlbumResponse(
                album.getAlbumId(),
                album.getAlbumCategory(),
                album.getTitle(),
                album.getDescription(),
                album.getDisplayOrder(),
                album.getCreatedBy().getUserId(),
                album.getCreatedBy().getNickname(),
                album.getCreatedAt(),
                album.getUpdatedAt()
        );
    }
}
