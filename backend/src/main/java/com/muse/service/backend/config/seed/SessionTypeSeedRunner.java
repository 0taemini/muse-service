package com.muse.service.backend.config.seed;

import com.muse.service.backend.service.seed.SessionTypeSeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionTypeSeedRunner implements ApplicationRunner {

    @Value("${app.seed.session-type-repair-enabled:true}")
    private boolean repairEnabled;

    private final SessionTypeSeedService sessionTypeSeedService;

    @Override
    public void run(ApplicationArguments args) {
        if (!repairEnabled) {
            return;
        }

        SessionTypeSeedService.RepairResult result = sessionTypeSeedService.ensureDefaults();
        log.info(
                "[SESSION-TYPE-SEED] repair done inserted={}, updated={}, repairedColumns={}, repairedSongSessions={}",
                result.insertedCount(),
                result.updatedCount(),
                result.repairedColumnCount(),
                result.repairedSongSessionCount()
        );
    }
}
