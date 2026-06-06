package com.orderflow.search.config;

import com.orderflow.search.dto.ReindexResponse;
import com.orderflow.search.service.ProductSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SearchBootstrapInitializer implements ApplicationRunner {

    private final ProductSearchService productSearchService;

    @Value("${application.search.reindex-on-startup}")
    private boolean reindexOnStartup;

    @Value("${application.search.reindex-startup-max-attempts}")
    private int maxAttempts;

    @Value("${application.search.reindex-startup-delay-ms}")
    private long delayMs;

    @Override
    public void run(ApplicationArguments args) {
        if (!reindexOnStartup) {
            log.info("Startup reindex disabled for search-service");
            return;
        }

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ReindexResponse response = productSearchService.reindexProducts();
                log.info("Startup reindex completed indexedCount={} completedAt={}", response.indexedCount(), response.completedAt());
                return;
            } catch (Exception exception) {
                log.warn("Startup reindex attempt {} of {} failed: {}", attempt, maxAttempts, exception.getMessage());
                sleepBeforeRetry(attempt);
            }
        }

        log.error("Search-service startup reindex failed after {} attempts", maxAttempts);
    }

    private void sleepBeforeRetry(int attempt) {
        if (attempt >= maxAttempts) {
            return;
        }

        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            log.warn("Startup reindex retry sleep interrupted");
        }
    }
}
