package com.muse.service.backend.service.seed;

import com.muse.service.backend.entity.AllUser;
import com.muse.service.backend.repository.AllUserRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AllUserSeedServiceImpl implements AllUserSeedService {

    private static final int REQUIRED_COLUMN_COUNT = 4;

    private final AllUserRepository allUserRepository;

    @Override
    @Transactional
    public ImportResult importFromCsv(Path csvPath) {
        if (!Files.exists(csvPath) || !Files.isRegularFile(csvPath)) {
            throw new IllegalStateException("CSV file was not found. path=" + csvPath);
        }

        int insertedCount = 0;
        int skippedCount = 0;
        int invalidCount = 0;
        int lineNumber = 0;

        try (var reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                String normalizedLine = removeBom(line).trim();
                if (!StringUtils.hasText(normalizedLine)) {
                    continue;
                }
                if (lineNumber == 1 && normalizedLine.toLowerCase().startsWith("cohort,")) {
                    continue;
                }

                String[] columns = normalizedLine.split(",", -1);
                if (columns.length < REQUIRED_COLUMN_COUNT) {
                    invalidCount++;
                    continue;
                }

                Integer cohort = parseCohort(columns[0]);
                String name = normalizeText(columns[1]);
                String email = normalizeText(columns[2]);
                String phone = normalizePhone(columns[3]);

                if (cohort == null || !StringUtils.hasText(name)) {
                    invalidCount++;
                    continue;
                }

                if (StringUtils.hasText(email) && allUserRepository.existsByEmailIgnoreCase(email)) {
                    skippedCount++;
                    continue;
                }

                if (allUserRepository.existsByNameAndCohortAndPhone(name, cohort, phone)) {
                    skippedCount++;
                    continue;
                }

                AllUser allUser = AllUser.builder()
                        .name(name)
                        .cohort(cohort)
                        .email(email)
                        .phone(phone)
                        .status(AllUser.AllUserStatus.ACTIVE)
                        .build();
                allUserRepository.save(allUser);
                insertedCount++;
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read CSV file. path=" + csvPath, e);
        }

        return new ImportResult(insertedCount, skippedCount, invalidCount);
    }

    private String removeBom(String value) {
        if (value != null && !value.isEmpty() && value.charAt(0) == '\uFEFF') {
            return value.substring(1);
        }
        return value;
    }

    private Integer parseCohort(String value) {
        try {
            return Integer.parseInt(normalizeText(value));
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return StringUtils.hasText(trimmed) ? trimmed : null;
    }

    private String normalizePhone(String value) {
        String normalized = normalizeText(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        String digitsOnly = normalized.replaceAll("[^0-9]", "");
        return StringUtils.hasText(digitsOnly) ? digitsOnly : null;
    }
}
