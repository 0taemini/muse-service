package com.muse.service.backend.config.swagger;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerSecurityConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenApiCustomizer jwtOpenApiCustomizer() {
        return openApi -> {
            Components components = openApi.getComponents();
            if (components == null) {
                components = new Components();
                openApi.setComponents(components);
            }

            components.addSecuritySchemes(
                    SECURITY_SCHEME_NAME,
                    new SecurityScheme()
                            .name(SECURITY_SCHEME_NAME)
                            .type(SecurityScheme.Type.HTTP)
                            .scheme("bearer")
                            .bearerFormat("JWT")
                            .description("JWT Access Token을 입력합니다. 예: eyJ...")
            );

            if (openApi.getSecurity() == null || openApi.getSecurity().isEmpty()) {
                openApi.addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
            }
        };
    }
}
