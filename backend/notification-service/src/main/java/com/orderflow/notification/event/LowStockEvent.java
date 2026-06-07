package com.orderflow.notification.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record LowStockEvent(
        UUID eventId,
        Long productId,
        String productName,
        Integer remainingStock,
        String adminEmail,
        LocalDateTime createdAt) {
}
