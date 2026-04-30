package com.muse.service.backend.controller;

import com.muse.service.backend.dto.chat.ChatRoomCreateRequest;
import com.muse.service.backend.dto.chat.ChatRoomDetailResponse;
import com.muse.service.backend.dto.chat.ChatRoomSummaryResponse;
import com.muse.service.backend.dto.chat.ChatRoundSummaryResponse;
import com.muse.service.backend.dto.chat.FeedbackSummaryResponse;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "채팅방 API", description = "공연 곡별 채팅방, 라운드, AI 피드백 API")
@RestController
@RequestMapping("/api/v1/performances/{performanceId}/chat-rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    private final SimpMessagingTemplate messagingTemplate;

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

    @Operation(summary = "채팅방 상세 조회", description = "채팅방의 현재 라운드, 메시지, 세션 목록, 새 라운드 시작 가능 여부를 조회합니다.")
    @GetMapping("/{chatRoomId}")
    public ResponseEntity<ApiResponse<ChatRoomDetailResponse>> getDetail(
            @PathVariable Integer performanceId,
            @PathVariable Integer chatRoomId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        ChatRoomDetailResponse response = chatRoomService.getDetail(
                performanceId,
                chatRoomId,
                authenticatedUserId(userDetails)
        );
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "채팅방 상세 정보를 조회했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "새 라운드 시작", description = "현재 라운드를 닫고 새 라운드를 시작합니다. 채팅방별로 6시간마다 한 번만 가능합니다.")
    @PostMapping("/{chatRoomId}/rounds")
    public ResponseEntity<ApiResponse<ChatRoundSummaryResponse>> startNewRound(
            @PathVariable Integer performanceId,
            @PathVariable Integer chatRoomId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        ChatRoundSummaryResponse response = chatRoomService.startNewRound(
                performanceId,
                chatRoomId,
                authenticatedUserId(userDetails)
        );
        messagingTemplate.convertAndSend("/topic/chat-rooms/" + chatRoomId + "/rounds", response);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "새 채팅 라운드를 시작했습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "AI 피드백 생성", description = "라운드 메시지를 기반으로 마이페이지용 피드백 요약을 생성합니다. 라운드당 한 번만 가능합니다.")
    @PostMapping("/{chatRoomId}/rounds/{chatRoundId}/ai-feedback")
    public ResponseEntity<ApiResponse<List<FeedbackSummaryResponse>>> summarizeRound(
            @PathVariable Integer performanceId,
            @PathVariable Integer chatRoomId,
            @PathVariable Integer chatRoundId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest
    ) {
        List<FeedbackSummaryResponse> response = chatRoomService.summarizeRound(
                performanceId,
                chatRoomId,
                chatRoundId,
                authenticatedUserId(userDetails)
        );
        messagingTemplate.convertAndSend("/topic/chat-rooms/" + chatRoomId + "/feedback-summaries", response);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "AI 피드백을 생성했습니다.", response, httpRequest.getRequestURI()));
    }

    private Integer authenticatedUserId(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userDetails.getUserId();
    }
}
