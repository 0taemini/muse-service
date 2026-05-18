package com.muse.service.backend.service.photo;

import com.muse.service.backend.dto.photo.PhotoAlbumDetailResponse;
import com.muse.service.backend.dto.photo.PhotoAlbumRequest;
import com.muse.service.backend.dto.photo.PhotoAlbumResponse;
import com.muse.service.backend.entity.PhotoAlbum;
import java.util.List;

public interface PhotoAlbumService {

    PhotoAlbumResponse create(Integer userId, PhotoAlbumRequest request);

    List<PhotoAlbumResponse> getAlbums(PhotoAlbum.AlbumCategory category);

    PhotoAlbumDetailResponse getAlbum(Integer albumId);

    PhotoAlbumResponse update(Integer userId, Integer albumId, PhotoAlbumRequest request);

    void delete(Integer userId, Integer albumId);
}
