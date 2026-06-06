package com.orderflow.order.client;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductReservationResponse(
        Long id,
        String name,
        String categoryCode,
        String categoryName,
        String description,
        BigDecimal price,
        Integer stockQuantity,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
