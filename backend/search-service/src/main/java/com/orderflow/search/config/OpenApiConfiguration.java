package com.orderflow.search.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI searchOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OrderFlow Search Service API")
                        .description("Search active products, generate suggestions, and manage OpenSearch reindexing.")
                        .version("v1"));
    }
}
