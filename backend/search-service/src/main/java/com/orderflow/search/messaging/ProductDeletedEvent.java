package com.orderflow.search.messaging;

public record ProductDeletedEvent(
        Long productId,
        String deletedAt) {
}
