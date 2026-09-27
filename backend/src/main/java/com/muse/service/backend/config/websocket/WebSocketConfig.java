package com.muse.service.backend.config.websocket;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;
    private final MeterRegistry meterRegistry;
    private final ThreadPoolTaskExecutor inboundExecutor;
    private final ThreadPoolTaskExecutor outboundExecutor;

    public WebSocketConfig(
            WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor,
            MeterRegistry meterRegistry,
            @Qualifier("webSocketInboundExecutor") ThreadPoolTaskExecutor inboundExecutor,
            @Qualifier("webSocketOutboundExecutor") ThreadPoolTaskExecutor outboundExecutor
    ) {
        this.webSocketAuthChannelInterceptor = webSocketAuthChannelInterceptor;
        this.meterRegistry = meterRegistry;
        this.inboundExecutor = inboundExecutor;
        this.outboundExecutor = outboundExecutor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws", "/ws/")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor(inboundExecutor);
        registration.interceptors(
                webSocketAuthChannelInterceptor,
                new StompMetricsChannelInterceptor(meterRegistry, "inbound")
        );
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor(outboundExecutor);
        registration.interceptors(new StompMetricsChannelInterceptor(meterRegistry, "outbound"));
    }
}
