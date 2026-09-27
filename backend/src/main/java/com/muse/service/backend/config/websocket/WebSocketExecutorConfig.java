package com.muse.service.backend.config.websocket;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class WebSocketExecutorConfig {

    @Bean("webSocketInboundExecutor")
    public ThreadPoolTaskExecutor webSocketInboundExecutor(MeterRegistry registry) {
        return createExecutor("inbound", 4, 16, 500, registry);
    }

    @Bean("webSocketOutboundExecutor")
    public ThreadPoolTaskExecutor webSocketOutboundExecutor(MeterRegistry registry) {
        return createExecutor("outbound", 4, 16, 1000, registry);
    }

    private ThreadPoolTaskExecutor createExecutor(
            String channel,
            int corePoolSize,
            int maxPoolSize,
            int queueCapacity,
            MeterRegistry registry
    ) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("ws-" + channel + "-");
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);

        Counter rejected = Counter.builder("muse.websocket.executor.rejected")
                .tag("channel", channel)
                .register(registry);
        executor.setRejectedExecutionHandler((task, pool) -> {
            rejected.increment();
            new ThreadPoolExecutor.AbortPolicy().rejectedExecution(task, pool);
        });

        Gauge.builder("muse.websocket.executor.active", executor, ThreadPoolTaskExecutor::getActiveCount)
                .tag("channel", channel)
                .register(registry);
        Gauge.builder("muse.websocket.executor.pool.size", executor, ThreadPoolTaskExecutor::getPoolSize)
                .tag("channel", channel)
                .register(registry);
        Gauge.builder("muse.websocket.executor.queue.size", executor,
                        value -> value.getThreadPoolExecutor().getQueue().size())
                .tag("channel", channel)
                .register(registry);
        return executor;
    }
}
