package com.muse.service.backend.config.web;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@RequiredArgsConstructor
public class WebClientConfig {
    @Bean("solapiClient")
    public WebClient solapiWebClient() {
        return WebClient.builder().baseUrl("https://api.solapi.com").build();
    }
}
