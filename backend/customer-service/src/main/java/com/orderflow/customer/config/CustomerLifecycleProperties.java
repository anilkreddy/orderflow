package com.orderflow.customer.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orderflow.customer")
public record CustomerLifecycleProperties(
        PasswordProperties password,
        PasswordEventCheckProperties passwordEventCheck) {

    public record PasswordProperties(int validityDays, int expiringWindowDays) {
    }

    public record PasswordEventCheckProperties(boolean enabled, Duration fixedDelay) {
    }
}
