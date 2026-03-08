package com.muse.service.backend.config.seed;

import com.muse.service.backend.service.seed.AllUserSeedService;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class AllUserSeedRunner implements ApplicationRunner {

    @Value("${app.seed.all-user-import-enabled:false}")
    private boolean importEnabled;

    @Value("${app.seed.all-user-csv-path:}")
    private String csvPath;

    private final AllUserSeedService allUserSeedService;

    @Override
    public void run(ApplicationArguments args) {
        if (!importEnabled) {
            return;
        }
        if (!StringUtils.hasText(csvPath)) {
            throw new IllegalStateException("all_user CSV import is enabled, but path is empty.");
        }

        AllUserSeedService.ImportResult result = allUserSeedService.importFromCsv(Path.of(csvPath));
        log.info(
                "[ALL-USER-SEED] import done inserted={}, skipped={}, invalid={}",
                result.insertedCount(),
                result.skippedCount(),
                result.invalidCount()
        );
    }
}
