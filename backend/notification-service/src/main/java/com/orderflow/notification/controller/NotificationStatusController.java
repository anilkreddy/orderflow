package com.orderflow.notification.controller;

import com.orderflow.notification.dto.ServiceStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Notification service status")
public class NotificationStatusController {

    @GetMapping("/status")
    @Operation(summary = "Retrieve notification service status")
    public ServiceStatusResponse status() {
        return new ServiceStatusResponse(
                "notification-service",
                "UP",
                "Consumes order.created, order.cancelled, and inventory.low-stock Kafka events to render Thymeleaf HTML emails.");
    }
}
