package com.muse.service.backend.config.websocket;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

@Component
public class WebSocketMetricsListener {

    private final Set<String> activeSessions = ConcurrentHashMap.newKeySet();
    private final Counter connections;
    private final Counter disconnections;
    private final Counter abnormalDisconnections;

    public WebSocketMetricsListener(MeterRegistry meterRegistry) {
        this.connections = meterRegistry.counter("muse.websocket.connections");
        this.disconnections = meterRegistry.counter("muse.websocket.disconnections");
        this.abnormalDisconnections = meterRegistry.counter("muse.websocket.abnormal.disconnections");
        Gauge.builder("muse.websocket.sessions.active", activeSessions, Set::size)
                .description("현재 활성 WebSocket 세션 수")
                .register(meterRegistry);
    }

    @EventListener
    public void handleConnected(SessionConnectedEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (sessionId != null && activeSessions.add(sessionId)) {
            connections.increment();
        }
    }

    @EventListener
    public void handleDisconnected(SessionDisconnectEvent event) {
        if (activeSessions.remove(event.getSessionId())) {
            disconnections.increment();
        }
        if (!CloseStatus.NORMAL.equals(event.getCloseStatus())) {
            abnormalDisconnections.increment();
        }
    }
}
