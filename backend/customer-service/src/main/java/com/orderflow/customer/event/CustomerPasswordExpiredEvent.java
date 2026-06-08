package com.orderflow.customer.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerPasswordExpiredEvent(
        UUID eventId,
        UUID customerId,
        String identityUserId,
        String email,
        LocalDateTime expiredAt,
        LocalDateTime occurredAt) {
}
