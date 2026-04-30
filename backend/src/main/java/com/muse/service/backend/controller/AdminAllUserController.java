package com.muse.service.backend.controller;

import com.muse.service.backend.dto.response.ApiResponse;
import com.muse.service.backend.dto.user.AllUserCreateRequest;
import com.muse.service.backend.dto.user.AllUserResponse;
import com.muse.service.backend.dto.user.AllUserStatusUpdateRequest;
import com.muse.service.backend.dto.user.AllUserUpdateRequest;
import com.muse.service.backend.service.user.AllUserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 명부 API", description = "관리자 전용 전체 회원 명부 조회, 추가, 수정, 논리 삭제 API")
@RestController
@RequestMapping("/api/v1/admin/all-users")
@RequiredArgsConstructor
public class AdminAllUserController {

    private final AllUserAdminService allUserAdminService;

    @Operation(summary = "전체 회원 명부 조회", description = "관리자가 가입 가능 대상자 명부를 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<AllUserResponse>>> getAll(HttpServletRequest httpRequest) {
        List<AllUserResponse> response = allUserAdminService.getAll();
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "전체 회원 명부 조회에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "전체 회원 명부 추가", description = "관리자가 가입 가능 대상자를 명부에 추가합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<AllUserResponse>> create(
            @Valid @RequestBody AllUserCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        AllUserResponse response = allUserAdminService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(HttpStatus.CREATED, "전체 회원 명부 추가에 성공했습니다.", response, httpRequest.getRequestURI()));
    }

    @Operation(summary = "전체 회원 명부 수정", description = "관리자가 가입 가능 대상자의 이름, 기수, email, 전화번호를 수정합니다.")
    @PatchMapping("/{allUserId}")
    public ResponseEntity<ApiResponse<AllUserResponse>> update(
            @PathVariable Integer allUserId,
            @Valid @RequestBody AllUserUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        AllUserResponse response = allUserAdminService.update(allUserId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "전체 회원 명부 수정에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "전체 회원 명부 상태 변경", description = "관리자가 가입 가능 대상자의 상태를 변경합니다.")
    @PatchMapping("/{allUserId}/status")
    public ResponseEntity<ApiResponse<AllUserResponse>> updateStatus(
            @PathVariable Integer allUserId,
            @Valid @RequestBody AllUserStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        AllUserResponse response = allUserAdminService.updateStatus(allUserId, request);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "전체 회원 명부 상태 변경에 성공했습니다.", response, httpRequest.getRequestURI())
        );
    }

    @Operation(summary = "전체 회원 명부 삭제", description = "관리자가 가입 가능 대상자를 논리 삭제합니다.")
    @DeleteMapping("/{allUserId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Integer allUserId,
            HttpServletRequest httpRequest
    ) {
        allUserAdminService.delete(allUserId);
        return ResponseEntity.ok(
                ApiResponse.of(HttpStatus.OK, "전체 회원 명부 삭제에 성공했습니다.", null, httpRequest.getRequestURI())
        );
    }
}
