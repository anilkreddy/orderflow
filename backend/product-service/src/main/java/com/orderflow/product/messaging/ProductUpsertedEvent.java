package com.orderflow.product.messaging;

import com.orderflow.product.dto.ProductResponse;
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

    public static ProductUpsertedEvent from(ProductResponse response) {
        return new ProductUpsertedEvent(
                response.id(),
                response.name(),
                response.categoryCode(),
                response.categoryName(),
                response.description(),
                response.price(),
                response.stockQuantity(),
                response.active(),
                response.createdAt() == null ? null : response.createdAt().toString(),
                response.updatedAt() == null ? null : response.updatedAt().toString());
    }
}
