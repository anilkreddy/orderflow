package com.orderflow.order.messaging;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OrderCreatedEvent(
        UUID eventId,
        Long orderId,
        String customerName,
        String customerEmail,
        BigDecimal totalAmount,
        String status,
        LocalDateTime createdAt) {
}
