package com.muse.service.backend.service.seed;

import java.nio.file.Path;

public interface AllUserSeedService {
    ImportResult importFromCsv(Path csvPath);

    record ImportResult(int insertedCount, int skippedCount, int invalidCount) {
    }
}

