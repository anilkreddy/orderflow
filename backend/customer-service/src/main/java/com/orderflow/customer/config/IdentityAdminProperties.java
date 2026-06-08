package com.orderflow.customer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "identity.admin")
public record IdentityAdminProperties(
        String serverUrl,
        String adminRealm,
        String realm,
        String username,
        String password,
        String clientId,
        String customerDefaultGroupPath) {
}
