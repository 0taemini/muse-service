package com.muse.service.backend.config.auth;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AuthCookieProperties.class)
public class AuthCookieConfig {
}
