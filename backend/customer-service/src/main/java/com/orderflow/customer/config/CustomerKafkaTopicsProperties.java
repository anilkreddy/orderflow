package com.orderflow.customer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "application.kafka")
public record CustomerKafkaTopicsProperties(
        String customerRegisteredTopic,
        String customerUpsertedTopic,
        String customerDeletedTopic,
        String customerPasswordChangedTopic,
        String customerPasswordExpiringTopic,
        String customerPasswordExpiredTopic) {
}
