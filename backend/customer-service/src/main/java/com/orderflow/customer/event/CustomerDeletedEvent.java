package com.orderflow.customer.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerDeletedEvent(
        UUID eventId,
        UUID customerId,
        String identityUserId,
        String username,
        String email,
        LocalDateTime deletedAt) {
}
