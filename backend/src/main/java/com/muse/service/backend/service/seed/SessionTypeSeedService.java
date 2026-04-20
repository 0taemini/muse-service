package com.muse.service.backend.service.seed;

public interface SessionTypeSeedService {

    RepairResult ensureDefaults();

    record RepairResult(
            int insertedCount,
            int updatedCount,
            int repairedColumnCount,
            int repairedSongSessionCount
    ) {
    }
}
