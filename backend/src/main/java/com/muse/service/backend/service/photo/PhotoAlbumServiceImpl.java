package com.muse.service.backend.service.photo;

import com.muse.service.backend.dto.photo.ImageResponse;
import com.muse.service.backend.dto.photo.PhotoAlbumDetailResponse;
import com.muse.service.backend.dto.photo.PhotoAlbumRequest;
import com.muse.service.backend.dto.photo.PhotoAlbumResponse;
import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.entity.PhotoAlbum;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ImageAssetRepository;
import com.muse.service.backend.repository.ImageVariantRepository;
import com.muse.service.backend.repository.PhotoAlbumRepository;
import com.muse.service.backend.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PhotoAlbumServiceImpl implements PhotoAlbumService {

    private final PhotoAlbumRepository photoAlbumRepository;
    private final ImageAssetRepository imageAssetRepository;
    private final ImageVariantRepository imageVariantRepository;
    private final UserRepository userRepository;
    private final ImageResponseMapper imageResponseMapper;

    @Override
    @Transactional
    public PhotoAlbumResponse create(Integer userId, PhotoAlbumRequest request) {
        User createdBy = findActiveUser(userId);
        PhotoAlbum album = photoAlbumRepository.save(PhotoAlbum.builder()
                .albumCategory(request.albumCategory())
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .displayOrder(request.displayOrder())
                .createdBy(createdBy)
                .build());

        return PhotoAlbumResponse.from(album);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PhotoAlbumResponse> getAlbums(PhotoAlbum.AlbumCategory category) {
        return photoAlbumRepository.findActive(category).stream()
                .map(PhotoAlbumResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PhotoAlbumDetailResponse getAlbum(Integer albumId) {
        PhotoAlbum album = findActiveAlbum(albumId);
        List<ImageAsset> images = imageAssetRepository.findByAlbumIdAndTypeAndStatus(
                albumId,
                ImageAsset.ImageType.ALBUM,
                ImageAsset.ImageStatus.READY
        );
        List<ImageResponse> responses = imageResponseMapper.toResponses(
                images,
                imageVariantRepository.findAllByImageIn(images)
        );

        return new PhotoAlbumDetailResponse(PhotoAlbumResponse.from(album), responses);
    }

    @Override
    @Transactional
    public PhotoAlbumResponse update(Integer userId, Integer albumId, PhotoAlbumRequest request) {
        User user = findActiveUser(userId);
        PhotoAlbum album = findActiveAlbum(albumId);
        ensureOwnerOrAdmin(user, album);

        album.updateDetails(
                request.albumCategory(),
                request.title().trim(),
                trimToNull(request.description()),
                request.displayOrder()
        );

        return PhotoAlbumResponse.from(album);
    }

    @Override
    @Transactional
    public void delete(Integer userId, Integer albumId) {
        User user = findActiveUser(userId);
        PhotoAlbum album = findActiveAlbum(albumId);
        ensureOwnerOrAdmin(user, album);
        album.markDeleted();
    }

    private PhotoAlbum findActiveAlbum(Integer albumId) {
        return photoAlbumRepository.findActiveById(albumId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_ALBUM_NOT_FOUND));
    }

    private User findActiveUser(Integer userId) {
        return userRepository.findByUserIdAndStatus(userId, User.UserStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void ensureOwnerOrAdmin(User user, PhotoAlbum album) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return;
        }

        if (!album.getCreatedBy().getUserId().equals(user.getUserId())) {
            throw new CustomException(ErrorCode.PHOTO_ALBUM_ACCESS_DENIED);
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
