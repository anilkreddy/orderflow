package com.orderflow.customer.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI customerServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("OrderFlow Customer Service API")
                .description("Customer profile management and identity lifecycle orchestration for Oflio Commerce")
                .version("v1"));
    }
}
