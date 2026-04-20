package com.muse.service.backend.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @Email String email,
        @Size(max = 255) String currentPassword,
        @Size(min = 8, max = 64)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)\\S{8,64}$",
                message = "비밀번호는 8자 이상 64자 이하이며, 영문과 숫자를 각각 1자 이상 포함하고 공백을 사용할 수 없습니다."
        )
        String password,
        @Min(1) Integer cohort
) {
}
