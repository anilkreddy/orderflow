package com.orderflow.gateway.dto;

public record GatewayStatusResponse(
        String service,
        String status,
        String description) {
}
