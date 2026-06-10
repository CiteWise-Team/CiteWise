package com.citewise.backend.config;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class AsyncConfig {
    @Bean(name = "aiScoringExecutor")
    public Executor aiScoringExecutor(
        @Value("${citewise.scoring.executor.core-pool-size:4}") int corePoolSize,
        @Value("${citewise.scoring.executor.max-pool-size:8}") int maxPoolSize,
        @Value("${citewise.scoring.executor.queue-capacity:100}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("ai-score-");
        executor.initialize();
        return executor;
    }

    @Bean(name = "pdfParsingExecutor")
    public Executor pdfParsingExecutor(
        @Value("${citewise.pdf.executor.core-pool-size:2}") int corePoolSize,
        @Value("${citewise.pdf.executor.max-pool-size:4}") int maxPoolSize,
        @Value("${citewise.pdf.executor.queue-capacity:50}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("pdf-parse-");
        executor.initialize();
        return executor;
    }
}
