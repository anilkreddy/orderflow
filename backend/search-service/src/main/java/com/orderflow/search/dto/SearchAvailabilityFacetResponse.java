package com.orderflow.search.dto;

public record SearchAvailabilityFacetResponse(
        long inStockCount,
        long outOfStockCount,
        long activeCount,
        long inactiveCount) {
}
