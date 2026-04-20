package com.muse.service.backend.dto.message;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageRequest(
        String from,
        String to,
        String text,
        String subject,
        String type
) {
}
