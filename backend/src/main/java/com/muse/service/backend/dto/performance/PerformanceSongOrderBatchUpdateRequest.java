package com.muse.service.backend.dto.performance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record PerformanceSongOrderBatchUpdateRequest(
        @NotNull(message = "곡 순서 버전은 필수입니다.")
        @PositiveOrZero(message = "곡 순서 버전은 0 이상이어야 합니다.")
        Long expectedOrderVersion,

        @NotEmpty(message = "변경할 곡 목록은 필수입니다.")
        List<@Valid SongOrder> songs
) {
    public record SongOrder(
            @NotNull(message = "공연 곡 ID는 필수입니다.")
            @Positive(message = "공연 곡 ID는 1 이상이어야 합니다.")
            Integer performanceSongId,

            @NotNull(message = "곡 순서는 필수입니다.")
            @Positive(message = "곡 순서는 1 이상이어야 합니다.")
            Integer orderNo
    ) {
    }
}
