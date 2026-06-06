package com.orderflow.search.client;

import java.math.BigDecimal;

public record ProductCatalogProductResponse(
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
