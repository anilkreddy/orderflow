package com.orderflow.search.dto;

import java.util.List;

public record SearchSynonymResponse(
        String id,
        String primaryTerm,
        List<String> terms,
        int termCount,
        String createdAt,
        String updatedAt) {
}
