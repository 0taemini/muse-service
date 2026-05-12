package com.muse.service.backend.service.photo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.muse.service.backend.config.storage.ImageStorageProperties;
import com.muse.service.backend.dto.photo.ImageUploadRequest;
import com.muse.service.backend.dto.photo.ImageVariantRequest;
import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.entity.ImageVariant;
import com.muse.service.backend.entity.PhotoAlbum;
import com.muse.service.backend.entity.User;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.repository.ImageAssetRepository;
import com.muse.service.backend.repository.ImageVariantRepository;
import com.muse.service.backend.repository.PhotoAlbumRepository;
import com.muse.service.backend.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ImageAssetServiceImplTest {

    @Mock
    private ImageAssetRepository imageAssetRepository;

    @Mock
    private ImageVariantRepository imageVariantRepository;

    @Mock
    private PhotoAlbumRepository photoAlbumRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ImageStorageService imageStorageService;

    @Mock
    private ImageResponseMapper imageResponseMapper;

    private ImageAssetServiceImpl imageAssetService;

    @BeforeEach
    void setUp() {
        imageAssetService = new ImageAssetServiceImpl(
                imageAssetRepository,
                imageVariantRepository,
                photoAlbumRepository,
                userRepository,
                imageStorageService,
                imageResponseMapper,
                new ImageStorageProperties(null, null, null, 10, "token", null, null, 20L * 1024L * 1024L)
        );
    }

    @Test
    void createUpload_whenPosterRequestedByUser_throwsCustomException() {
        User user = user(1, User.UserRole.USER);
        when(userRepository.findByUserIdAndStatus(1, User.UserStatus.ACTIVE)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> imageAssetService.createUpload(1, uploadRequest(ImageAsset.ImageType.POSTER, null)))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.IMAGE_POSTER_ADMIN_ONLY));
    }

    @Test
    void createUpload_whenMemoryDateIsMissing_throwsCustomException() {
        User user = user(1, User.UserRole.USER);
        when(userRepository.findByUserIdAndStatus(1, User.UserStatus.ACTIVE)).thenReturn(Optional.of(user));

        ImageUploadRequest request = new ImageUploadRequest(
                ImageAsset.ImageType.MEMORY,
                null,
                null,
                "합주 끝나고 찍은 사진",
                null,
                null,
                "memory.jpg",
                "image/jpeg",
                1024L
        );

        assertThatThrownBy(() -> imageAssetService.createUpload(1, request))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.IMAGE_INVALID_TYPE_POLICY));
    }

    @Test
    void createUpload_whenAlbumPhotoRequested_returnsPresignedUpload() {
        User user = user(1, User.UserRole.USER);
        PhotoAlbum album = album(10, user);
        when(userRepository.findByUserIdAndStatus(1, User.UserStatus.ACTIVE)).thenReturn(Optional.of(user));
        when(photoAlbumRepository.findActiveById(10)).thenReturn(Optional.of(album));
        when(imageStorageService.createPresignedUpload(any(String.class), any(String.class)))
                .thenReturn(new ImageStorageService.PresignedUpload(
                        "https://example.com/upload",
                        LocalDateTime.of(2026, 5, 11, 12, 10)
                ));
        when(imageAssetRepository.save(any(ImageAsset.class))).thenAnswer(invocation -> {
            ImageAsset image = invocation.getArgument(0);
            ReflectionTestUtils.setField(image, "imageId", 77);
            ReflectionTestUtils.setField(image, "createdAt", LocalDateTime.of(2026, 5, 11, 12, 0));
            ReflectionTestUtils.setField(image, "updatedAt", LocalDateTime.of(2026, 5, 11, 12, 0));
            return image;
        });

        var response = imageAssetService.createUpload(
                1,
                uploadRequest(ImageAsset.ImageType.ALBUM, 10)
        );

        assertThat(response.imageId()).isEqualTo(77);
        assertThat(response.uploadUrl()).isEqualTo("https://example.com/upload");
        assertThat(response.originalKey()).startsWith("original/album/77/");
        assertThat(response.originalKey()).endsWith(".jpg");
    }

    @Test
    void createUpload_whenFileIsTooLarge_throwsCustomException() {
        User user = user(1, User.UserRole.USER);
        when(userRepository.findByUserIdAndStatus(1, User.UserStatus.ACTIVE)).thenReturn(Optional.of(user));

        ImageUploadRequest request = new ImageUploadRequest(
                ImageAsset.ImageType.MEMORY,
                null,
                "사진",
                "설명",
                LocalDate.of(2026, 5, 11),
                null,
                "photo.jpg",
                "image/jpeg",
                20L * 1024L * 1024L + 1L
        );

        assertThatThrownBy(() -> imageAssetService.createUpload(1, request))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.IMAGE_FILE_TOO_LARGE));
    }

    @Test
    void upsertVariant_whenS3KeyDoesNotMatchImage_throwsCustomException() {
        User user = user(1, User.UserRole.USER);
        ImageAsset image = image(77, ImageAsset.ImageType.MEMORY, user);
        when(imageAssetRepository.findActiveById(77)).thenReturn(Optional.of(image));

        ImageVariantRequest request = new ImageVariantRequest(
                ImageVariant.VariantType.THUMB_320,
                "resized/album/77/photo_320.webp",
                320,
                240,
                "image/webp"
        );

        assertThatThrownBy(() -> imageAssetService.upsertVariant(77, request))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.IMAGE_INVALID_TYPE_POLICY));
    }

    private ImageUploadRequest uploadRequest(ImageAsset.ImageType imageType, Integer albumId) {
        return new ImageUploadRequest(
                imageType,
                albumId,
                imageType == ImageAsset.ImageType.POSTER ? "정기공연" : "사진",
                "설명",
                imageType == ImageAsset.ImageType.MEMORY ? LocalDate.of(2026, 5, 11) : null,
                null,
                "photo.jpg",
                "image/jpeg",
                1024L
        );
    }

    private PhotoAlbum album(Integer albumId, User user) {
        PhotoAlbum album = PhotoAlbum.builder()
                .albumCategory(PhotoAlbum.AlbumCategory.PERFORMANCE)
                .title("여름공연")
                .description(null)
                .displayOrder(0)
                .createdBy(user)
                .build();
        ReflectionTestUtils.setField(album, "albumId", albumId);
        ReflectionTestUtils.setField(album, "createdAt", LocalDateTime.of(2026, 5, 11, 12, 0));
        ReflectionTestUtils.setField(album, "updatedAt", LocalDateTime.of(2026, 5, 11, 12, 0));
        return album;
    }

    private ImageAsset image(Integer imageId, ImageAsset.ImageType imageType, User user) {
        ImageAsset image = ImageAsset.builder()
                .imageType(imageType)
                .album(null)
                .title("사진")
                .description(null)
                .imageDate(LocalDate.of(2026, 5, 11))
                .displayOrder(0)
                .originalKey("original/%s/%d/photo.jpg".formatted(imageType.name().toLowerCase(), imageId))
                .originalContentType("image/jpeg")
                .originalFileSize(1024L)
                .createdBy(user)
                .build();
        ReflectionTestUtils.setField(image, "imageId", imageId);
        ReflectionTestUtils.setField(image, "createdAt", LocalDateTime.of(2026, 5, 11, 12, 0));
        ReflectionTestUtils.setField(image, "updatedAt", LocalDateTime.of(2026, 5, 11, 12, 0));
        return image;
    }

    private User user(Integer id, User.UserRole role) {
        User user = User.builder()
                .allUser(null)
                .name("User " + id)
                .cohort(1)
                .email("user" + id + "@example.com")
                .password("encoded")
                .nickname("user" + id)
                .representativeSessionType(null)
                .rank(User.UserRank.ACTIVE)
                .status(User.UserStatus.ACTIVE)
                .role(role)
                .build();
        ReflectionTestUtils.setField(user, "userId", id);
        return user;
    }
}
