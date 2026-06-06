package com.orderflow.search.service;

import com.orderflow.search.client.ProductCatalogProductResponse;
import com.orderflow.search.dto.ProductSearchHitResponse;
import com.orderflow.search.messaging.ProductUpsertedEvent;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public record IndexedProductDocument(
        Long id,
        String name,
        String nameSuggest,
        String categoryCode,
        String categoryName,
        String description,
        List<String> searchKeywords,
        BigDecimal price,
        Integer stockQuantity,
        Boolean active,
        Boolean inStock,
        Double popularityScore,
        String createdAt,
        String updatedAt) {

    public static IndexedProductDocument fromCatalogProduct(ProductCatalogProductResponse product) {
        return new IndexedProductDocument(
                product.id(),
                product.name(),
                product.name(),
                product.categoryCode(),
                product.categoryName(),
                product.description(),
                buildSearchKeywords(product.name(), product.categoryName(), product.description(), product.categoryCode()),
                product.price(),
                product.stockQuantity(),
                product.active(),
                product.stockQuantity() != null && product.stockQuantity() > 0,
                calculatePopularityScore(product.stockQuantity(), product.createdAt(), product.active()),
                product.createdAt(),
                product.updatedAt());
    }

    public static IndexedProductDocument fromEvent(ProductUpsertedEvent event) {
        return new IndexedProductDocument(
                event.id(),
                event.name(),
                event.name(),
                event.categoryCode(),
                event.categoryName(),
                event.description(),
                buildSearchKeywords(event.name(), event.categoryName(), event.description(), event.categoryCode()),
                event.price(),
                event.stockQuantity(),
                event.active(),
                event.stockQuantity() != null && event.stockQuantity() > 0,
                calculatePopularityScore(event.stockQuantity(), event.createdAt(), event.active()),
                event.createdAt(),
                event.updatedAt());
    }

    public ProductSearchHitResponse toResponse(double score) {
        return new ProductSearchHitResponse(
                id,
                name,
                categoryCode,
                categoryName,
                description,
                price,
                stockQuantity,
                active,
                inStock,
                popularityScore,
                score,
                createdAt,
                updatedAt);
    }

    private static List<String> buildSearchKeywords(String name,
                                                    String categoryName,
                                                    String description,
                                                    String categoryCode) {
        Set<String> keywords = new LinkedHashSet<>();
        addKeywordTokens(keywords, name);
        addKeywordTokens(keywords, categoryName);
        addKeywordTokens(keywords, description);
        addKeywordTokens(keywords, categoryCode == null ? null : categoryCode.replace('-', ' '));
        return new ArrayList<>(keywords);
    }

    private static void addKeywordTokens(Set<String> keywords, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        for (String token : value.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (token.length() >= 3) {
                keywords.add(token);
            }
        }
    }

    private static double calculatePopularityScore(Integer stockQuantity, String createdAt, Boolean active) {
        double stockComponent = Math.min(stockQuantity == null ? 0 : stockQuantity, 80);
        double freshnessComponent = 0;
        if (createdAt != null && !createdAt.isBlank()) {
            try {
                long ageDays = Math.max(0, Duration.between(LocalDateTime.parse(createdAt), LocalDateTime.now()).toDays());
                freshnessComponent = Math.max(0, 45 - Math.min(ageDays, 45)) * 0.65;
            } catch (DateTimeParseException ignored) {
                freshnessComponent = 0;
            }
        }
        double activeComponent = Boolean.TRUE.equals(active) ? 8 : 0;
        return BigDecimal.valueOf(stockComponent + freshnessComponent + activeComponent)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
