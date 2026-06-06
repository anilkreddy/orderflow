package com.orderflow.product.messaging;

import java.time.LocalDateTime;

public record ProductDeletedEvent(
        Long productId,
        String deletedAt) {

    public static ProductDeletedEvent of(Long productId) {
        return new ProductDeletedEvent(productId, LocalDateTime.now().toString());
    }
}
