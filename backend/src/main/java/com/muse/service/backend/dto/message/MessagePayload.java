package com.muse.service.backend.dto.message;

import java.util.List;
import lombok.Builder;

@Builder
public record MessagePayload(
        List<MessageRequest> messages
) {
}
