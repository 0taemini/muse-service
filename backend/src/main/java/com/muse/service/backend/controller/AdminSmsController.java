package com.muse.service.backend.controller;

import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.sms.BulkSmsSendRequest;
import com.muse.service.backend.dto.sms.BulkSmsSendResponse;
import com.muse.service.backend.service.sms.BulkSmsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 문자 API", description = "전체 명부 회원을 대상으로 하는 관리자 단체 문자 발송 API")
@RestController
@RequestMapping("/api/v1/admin/sms")
@RequiredArgsConstructor
public class AdminSmsController {

    private final BulkSmsService bulkSmsService;

    @Operation(summary = "단체 문자 발송", description = "활성 상태인 전체 명부 회원에게 이름을 치환하여 문자를 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<BulkSmsSendResponse>> send(
            @Valid @RequestBody BulkSmsSendRequest request,
            HttpServletRequest httpRequest
    ) {
        BulkSmsSendResponse response = bulkSmsService.send(request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "단체 문자 발송에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }
}