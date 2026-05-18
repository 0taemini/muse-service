package com.muse.service.backend.controller;

import com.muse.service.backend.config.storage.ImageStorageProperties;
import com.muse.service.backend.dto.photo.ImageResponse;
import com.muse.service.backend.dto.photo.ImageUpdateRequest;
import com.muse.service.backend.dto.photo.ImageUploadRequest;
import com.muse.service.backend.dto.photo.ImageUploadResponse;
import com.muse.service.backend.dto.photo.ImageVariantRequest;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.entity.ImageAsset;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.photo.ImageAssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사진 API", description = "포스터, 추억 캘린더, 앨범 사진 업로드와 조회를 관리하는 API")
@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageAssetController {

    private final ImageAssetService imageAssetService;
    private final ImageStorageProperties imageStorageProperties;

    @Operation(summary = "이미지 업로드 URL 발급", description = "이미지 메타데이터를 저장하고 S3 presigned PUT URL을 발급합니다.")
    @PostMapping("/upload-requests")
    public ResponseEntity<ApiResponse<ImageUploadResponse>> createUpload(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ImageUploadRequest request,
            HttpServletRequest httpRequest
    ) {
        ImageUploadResponse response = imageAssetService.createUpload(authenticatedUserId(userDetails), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "이미지 업로드 URL을 발급했습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "이미지 상세 조회", description = "비회원도 이미지 상세 정보를 조회할 수 있습니다.")
    @GetMapping("/{imageId}")
    public ResponseEntity<ApiResponse<ImageResponse>> getImage(
            @PathVariable Integer imageId,
            HttpServletRequest httpRequest
    ) {
        ImageResponse response = imageAssetService.getImage(imageId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "포스터/앨범형 이미지 목록 조회", description = "POSTER 또는 ALBUM 타입의 READY 이미지 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ImageResponse>>> getImages(
            @RequestParam ImageAsset.ImageType type,
            HttpServletRequest httpRequest
    ) {
        List<ImageResponse> response = imageAssetService.getImagesByType(type);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "추억 캘린더 이미지 조회", description = "날짜 또는 기간 기준으로 MEMORY 타입의 READY 이미지를 조회합니다.")
    @GetMapping("/memories")
    public ResponseEntity<ApiResponse<List<ImageResponse>>> getMemories(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest httpRequest
    ) {
        List<ImageResponse> response = imageAssetService.getMemories(date, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "추억 사진 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "이미지 정보 수정", description = "이미지 작성자 또는 관리자가 제목, 설명, 날짜, 순서를 수정합니다.")
    @PatchMapping("/{imageId}")
    public ResponseEntity<ApiResponse<ImageResponse>> update(
            @PathVariable Integer imageId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ImageUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        ImageResponse response = imageAssetService.update(authenticatedUserId(userDetails), imageId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지 정보를 수정했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "이미지 리사이즈 결과 반영", description = "Lambda가 생성한 리사이즈 이미지 정보를 저장합니다.")
    @PostMapping("/{imageId}/variants")
    public ResponseEntity<ApiResponse<ImageResponse>> upsertVariant(
            @PathVariable Integer imageId,
            @RequestHeader(name = "X-Muse-Image-Callback-Token", required = false) String callbackToken,
            @Valid @RequestBody ImageVariantRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureValidCallbackToken(callbackToken);
        ImageResponse response = imageAssetService.upsertVariant(imageId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지 리사이즈 결과를 반영했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "이미지 처리 실패 처리", description = "Lambda 리사이즈 실패 시 이미지 상태를 FAILED로 변경합니다.")
    @PatchMapping("/{imageId}/failed")
    public ResponseEntity<ApiResponse<Void>> markFailed(
            @PathVariable Integer imageId,
            @RequestHeader(name = "X-Muse-Image-Callback-Token", required = false) String callbackToken,
            HttpServletRequest httpRequest
    ) {
        ensureValidCallbackToken(callbackToken);
        imageAssetService.markFailed(imageId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지 처리 실패 상태를 반영했습니다.", null, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "이미지 삭제", description = "이미지 작성자 또는 관리자가 이미지를 소프트 삭제합니다.")
    @DeleteMapping("/{imageId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer imageId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        imageAssetService.delete(authenticatedUserId(userDetails), imageId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "이미지를 삭제했습니다.", null, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }

    private void ensureValidCallbackToken(String callbackToken) {
        String configuredToken = imageStorageProperties.lambdaCallbackToken();
        if (configuredToken == null || configuredToken.isBlank()) {
            throw new CustomException(ErrorCode.IMAGE_STORAGE_NOT_CONFIGURED);
        }

        if (callbackToken == null || !configuredToken.equals(callbackToken)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
    }
}
