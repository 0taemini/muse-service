package com.muse.service.backend.controller;

import com.muse.service.backend.dto.photo.PhotoAlbumDetailResponse;
import com.muse.service.backend.dto.photo.PhotoAlbumRequest;
import com.muse.service.backend.dto.photo.PhotoAlbumResponse;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.entity.PhotoAlbum;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.photo.PhotoAlbumService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사진 앨범 API", description = "공연/활동 사진을 묶는 앨범을 관리하는 API")
@RestController
@RequestMapping("/api/v1/photo-albums")
@RequiredArgsConstructor
public class PhotoAlbumController {

    private final PhotoAlbumService photoAlbumService;

    @Operation(summary = "사진 앨범 목록 조회", description = "비회원도 사진 앨범 목록을 조회할 수 있습니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoAlbumResponse>>> getAlbums(
            @RequestParam(required = false) PhotoAlbum.AlbumCategory category,
            HttpServletRequest httpRequest
    ) {
        List<PhotoAlbumResponse> response = photoAlbumService.getAlbums(category);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사진 앨범 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사진 앨범 상세 조회", description = "앨범 정보와 앨범에 포함된 READY 상태의 사진을 조회합니다.")
    @GetMapping("/{albumId}")
    public ResponseEntity<ApiResponse<PhotoAlbumDetailResponse>> getAlbum(
            @PathVariable Integer albumId,
            HttpServletRequest httpRequest
    ) {
        PhotoAlbumDetailResponse response = photoAlbumService.getAlbum(albumId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사진 앨범 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사진 앨범 생성", description = "로그인한 회원이 공연/활동 사진 앨범을 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PhotoAlbumResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PhotoAlbumRequest request,
            HttpServletRequest httpRequest
    ) {
        PhotoAlbumResponse response = photoAlbumService.create(authenticatedUserId(userDetails), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "사진 앨범을 생성했습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "사진 앨범 수정", description = "앨범 작성자 또는 관리자가 앨범 정보를 수정합니다.")
    @PatchMapping("/{albumId}")
    public ResponseEntity<ApiResponse<PhotoAlbumResponse>> update(
            @PathVariable Integer albumId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PhotoAlbumRequest request,
            HttpServletRequest httpRequest
    ) {
        PhotoAlbumResponse response = photoAlbumService.update(authenticatedUserId(userDetails), albumId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사진 앨범을 수정했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "사진 앨범 삭제", description = "앨범 작성자 또는 관리자가 앨범을 소프트 삭제합니다.")
    @DeleteMapping("/{albumId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer albumId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        photoAlbumService.delete(authenticatedUserId(userDetails), albumId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "사진 앨범을 삭제했습니다.", null, httpRequest.getRequestURI())
        );
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
