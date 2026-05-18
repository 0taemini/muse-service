package com.muse.service.backend.service.photo;

import com.muse.service.backend.dto.photo.ImageResponse;
import com.muse.service.backend.dto.photo.ImageUpdateRequest;
import com.muse.service.backend.dto.photo.ImageUploadRequest;
import com.muse.service.backend.dto.photo.ImageUploadResponse;
import com.muse.service.backend.dto.photo.ImageVariantRequest;
import com.muse.service.backend.entity.ImageAsset;
import java.time.LocalDate;
import java.util.List;

public interface ImageAssetService {

    ImageUploadResponse createUpload(Integer userId, ImageUploadRequest request);

    ImageResponse getImage(Integer imageId);

    List<ImageResponse> getImagesByType(ImageAsset.ImageType imageType);

    List<ImageResponse> getMemories(LocalDate date, LocalDate startDate, LocalDate endDate);

    ImageResponse update(Integer userId, Integer imageId, ImageUpdateRequest request);

    ImageResponse upsertVariant(Integer imageId, ImageVariantRequest request);

    void markFailed(Integer imageId);

    void delete(Integer userId, Integer imageId);
}
