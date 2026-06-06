package com.orderflow.search.dto;

import java.util.List;

public record SearchTuningResponse(
        List<String> synonyms,
        SearchBoostTuningResponse boosts,
        double popularityFactor,
        double inStockWeight,
        double activeWeight) {
}
