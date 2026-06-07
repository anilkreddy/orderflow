package com.orderflow.notification.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI notificationOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("OrderFlow Notification Service API")
                        .description("Consumes order.created, order.cancelled, and inventory.low-stock Kafka events, renders Thymeleaf email templates, and sends or previews HTML emails.")
                        .version("v1"));
    }
}
