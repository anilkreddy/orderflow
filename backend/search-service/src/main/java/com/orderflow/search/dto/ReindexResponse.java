package com.orderflow.search.dto;

public record ReindexResponse(
        String status,
        int indexedCount,
        String completedAt) {
}
