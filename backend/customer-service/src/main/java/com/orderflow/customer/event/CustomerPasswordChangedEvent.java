package com.orderflow.customer.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerPasswordChangedEvent(
        UUID eventId,
        UUID customerId,
        String identityUserId,
        String email,
        LocalDateTime changedAt,
        LocalDateTime expiresAt) {
}
