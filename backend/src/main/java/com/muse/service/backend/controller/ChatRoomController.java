package com.muse.service.backend.controller;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import com.muse.service.backend.security.model.CustomUserDetails;
import com.muse.service.backend.service.chat.ChatRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "채팅방 API", description = "공연 아래에서 확정 곡 기준으로 채팅방을 생성하고 목록을 조회하는 API")
@RestController
@RequestMapping("/api/v1/performances/{performanceId}/chat-rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @Operation(summary = "채팅방 목록 조회", description = "현재 화면에 보여야 하는 확정 곡 채팅방 목록만 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ChatRoomSummaryResponse>>> getVisibleRooms(
            @PathVariable Integer performanceId,
            HttpServletRequest httpRequest
    ) {
        List<ChatRoomSummaryResponse> response = chatRoomService.getVisibleRooms(performanceId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "보이는 채팅방 목록을 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "채팅방 생성", description = "확정(CONFIRMED) 상태 곡을 선택해 곡당 1개 기준으로 채팅방과 첫 라운드를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<List<ChatRoomSummaryResponse>>> createRooms(
            @PathVariable Integer performanceId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ChatRoomCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        List<ChatRoomSummaryResponse> response = chatRoomService.createRooms(
                performanceId,
                authenticatedUserId(userDetails),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "채팅방이 생성되었습니다.", response, httpRequest.getRequestURI()));
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
