package com.muse.service.backend.dto.photo;

import java.util.List;

public record PhotoAlbumDetailResponse(
        PhotoAlbumResponse album,
        List<ImageResponse> images
) {
}
