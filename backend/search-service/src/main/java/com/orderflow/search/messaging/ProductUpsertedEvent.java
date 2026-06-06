package com.orderflow.search.messaging;

import java.math.BigDecimal;

public record ProductUpsertedEvent(
        Long id,
        String name,
        String categoryCode,
        String categoryName,
        String description,
        BigDecimal price,
        Integer stockQuantity,
        Boolean active,
        String createdAt,
        String updatedAt) {
}
