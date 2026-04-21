package com.muse.service.backend.dto.chat;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ChatRoomCreateRequest(
        @NotEmpty List<@NotNull Integer> performanceSongIds
) {
}
