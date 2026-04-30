package com.muse.service.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChatMessageSendRequest(
        @NotNull Integer targetPerformanceSongSessionId,
        @NotBlank String content
) {
}
