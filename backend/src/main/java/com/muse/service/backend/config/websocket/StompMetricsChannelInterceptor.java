package com.muse.service.backend.config.websocket;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

public class StompMetricsChannelInterceptor implements ChannelInterceptor {

    private final MeterRegistry meterRegistry;
    private final String direction;
    private final ConcurrentMap<String, Counter> counters = new ConcurrentHashMap<>();

    public StompMetricsChannelInterceptor(MeterRegistry meterRegistry, String direction) {
        this.meterRegistry = meterRegistry;
        this.direction = direction;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        StompCommand command = accessor == null ? null : accessor.getCommand();
        String commandName = command == null ? "UNKNOWN" : command.name();
        counters.computeIfAbsent(commandName, name -> Counter.builder("muse.stomp.frames")
                        .description("방향 및 명령별 STOMP 프레임 수")
                        .tag("direction", direction)
                        .tag("command", name)
                        .register(meterRegistry))
                .increment();
        return message;
    }
}
