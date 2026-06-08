package com.orderflow.notification.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderCancelledEvent(
        UUID eventId,
        Long orderId,
        String orderCode,
        String customerName,
        String customerEmail,
        String cancellationReason,
        LocalDateTime cancelledAt) {
}
