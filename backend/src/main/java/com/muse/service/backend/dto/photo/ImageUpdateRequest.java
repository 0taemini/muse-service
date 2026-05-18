package com.muse.service.backend.dto.photo;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ImageUpdateRequest(
        @Size(max = 100, message = "제목은 100자 이하로 입력해주세요.")
        String title,
        String description,
        LocalDate imageDate,
        Integer displayOrder
) {
}
