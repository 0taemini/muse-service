package com.muse.service.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank String verificationToken,
        @NotBlank @Email String email,
        @NotBlank
        @Size(min = 8, max = 64)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)\\S{8,64}$",
                message = "비밀번호는 8자 이상 64자 이하이며, 영문과 숫자를 각각 1자 이상 포함하고 공백을 사용할 수 없습니다."
        )
        String password,
        @NotBlank
        @Size(min = 8, max = 64)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)\\S{8,64}$",
                message = "비밀번호는 8자 이상 64자 이하이며, 영문과 숫자를 각각 1자 이상 포함하고 공백을 사용할 수 없습니다."
        )
        String confirmPassword,
        @NotBlank @Size(max = 30) String nickname
) {
}
