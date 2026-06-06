package com.orderflow.product.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI productOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OrderFlow Product Service API")
                        .description("Manage products and reserve stock for incoming orders.")
                        .version("v1"));
    }
}
