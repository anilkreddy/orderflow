package com.orderflow.gateway.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI gatewayOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OrderFlow API Gateway")
                        .description("Spring Cloud Gateway routes for the OrderFlow frontend and backend services.")
                        .version("v1"));
    }
}
