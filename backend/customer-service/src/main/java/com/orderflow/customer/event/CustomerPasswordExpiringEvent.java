package com.orderflow.customer.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerPasswordExpiringEvent(
        UUID eventId,
        UUID customerId,
        String identityUserId,
        String email,
        LocalDateTime expiresAt,
        long daysRemaining,
        LocalDateTime occurredAt) {
}
