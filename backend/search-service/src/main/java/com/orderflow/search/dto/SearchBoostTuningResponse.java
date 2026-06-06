package com.orderflow.search.dto;

public record SearchBoostTuningResponse(
        double exactName,
        double phrasePrefix,
        double category,
        double keywords,
        double description) {
}
