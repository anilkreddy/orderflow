package com.orderflow.search.config;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "application.search.tuning")
public class SearchTuningProperties {

    private List<String> synonyms = new ArrayList<>(List.of(
            "tv, television, smart tv",
            "phone, smartphone, mobile",
            "laptop, notebook, ultrabook",
            "headphones, headset, earbuds",
            "fridge, refrigerator",
            "sofa, couch",
            "sneakers, trainers, running shoes",
            "shampoo, hair cleanser",
            "planner, journal, notebook",
            "pet bed, dog bed, cat bed"));

    private final Boosts boosts = new Boosts();

    private final Weights weights = new Weights();

    private List<PriceBand> priceBands = new ArrayList<>(List.of(
            new PriceBand("under-25", "Under $25", null, new BigDecimal("25"), true),
            new PriceBand("25-50", "$25 to $50", new BigDecimal("25"), new BigDecimal("50"), true),
            new PriceBand("50-100", "$50 to $100", new BigDecimal("50"), new BigDecimal("100"), true),
            new PriceBand("100-250", "$100 to $250", new BigDecimal("100"), new BigDecimal("250"), true),
            new PriceBand("250-plus", "$250 and above", new BigDecimal("250"), null, false)));

    public List<String> getSynonyms() {
        return synonyms;
    }

    public void setSynonyms(List<String> synonyms) {
        this.synonyms = synonyms;
    }

    public Boosts getBoosts() {
        return boosts;
    }

    public Weights getWeights() {
        return weights;
    }

    public List<PriceBand> getPriceBands() {
        return priceBands;
    }

    public void setPriceBands(List<PriceBand> priceBands) {
        this.priceBands = priceBands;
    }

    public static class Boosts {

        private double exactName = 8.0;
        private double phrasePrefix = 5.0;
        private double category = 2.4;
        private double keywords = 4.2;
        private double description = 1.3;

        public double getExactName() {
            return exactName;
        }

        public void setExactName(double exactName) {
            this.exactName = exactName;
        }

        public double getPhrasePrefix() {
            return phrasePrefix;
        }

        public void setPhrasePrefix(double phrasePrefix) {
            this.phrasePrefix = phrasePrefix;
        }

        public double getCategory() {
            return category;
        }

        public void setCategory(double category) {
            this.category = category;
        }

        public double getKeywords() {
            return keywords;
        }

        public void setKeywords(double keywords) {
            this.keywords = keywords;
        }

        public double getDescription() {
            return description;
        }

        public void setDescription(double description) {
            this.description = description;
        }
    }

    public static class Weights {

        private double popularityFactor = 0.08;
        private double inStock = 1.15;
        private double active = 1.05;

        public double getPopularityFactor() {
            return popularityFactor;
        }

        public void setPopularityFactor(double popularityFactor) {
            this.popularityFactor = popularityFactor;
        }

        public double getInStock() {
            return inStock;
        }

        public void setInStock(double inStock) {
            this.inStock = inStock;
        }

        public double getActive() {
            return active;
        }

        public void setActive(double active) {
            this.active = active;
        }
    }

    public static class PriceBand {

        private String code;
        private String label;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private boolean upperExclusive;

        public PriceBand() {
        }

        public PriceBand(String code, String label, BigDecimal minPrice, BigDecimal maxPrice, boolean upperExclusive) {
            this.code = code;
            this.label = label;
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
            this.upperExclusive = upperExclusive;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public BigDecimal getMinPrice() {
            return minPrice;
        }

        public void setMinPrice(BigDecimal minPrice) {
            this.minPrice = minPrice;
        }

        public BigDecimal getMaxPrice() {
            return maxPrice;
        }

        public void setMaxPrice(BigDecimal maxPrice) {
            this.maxPrice = maxPrice;
        }

        public boolean isUpperExclusive() {
            return upperExclusive;
        }

        public void setUpperExclusive(boolean upperExclusive) {
            this.upperExclusive = upperExclusive;
        }
    }
}
