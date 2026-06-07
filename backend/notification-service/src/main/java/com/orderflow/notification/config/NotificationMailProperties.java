package com.orderflow.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "notification.email")
public class NotificationMailProperties {

    private boolean enabled = false;
    private String from = "no-reply@orderflow.local";
    private String replyTo = "support@orderflow.local";
    private String storeName = "Oflio Commerce";
    private String storefrontBaseUrl = "http://localhost:5173";
}
