package com.orderflow.notification.dto;

public record ServiceStatusResponse(
        String service,
        String status,
        String description) {
}
