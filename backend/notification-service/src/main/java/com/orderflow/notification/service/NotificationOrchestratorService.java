package com.orderflow.notification.service;

import com.orderflow.notification.config.NotificationMailProperties;
import com.orderflow.notification.event.LowStockEvent;
import com.orderflow.notification.event.OrderCancelledEvent;
import com.orderflow.notification.event.OrderCreatedEvent;
import com.orderflow.notification.event.OrderCreatedLineItemEvent;
import com.orderflow.notification.template.EmailTemplateService;
import com.orderflow.notification.template.EmailTemplateType;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationOrchestratorService {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a");

    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;
    private final NotificationMailProperties mailProperties;

    public void handleOrderCreated(OrderCreatedEvent event) {
        Map<String, Object> variables = baseVariables();
        variables.put("customerName", event.customerName());
        variables.put("orderId", event.orderId());
        variables.put("lineItems", buildOrderLineItems(event.lineItems()));
        variables.put("subtotalAmount", formatCurrency(event.subtotalAmount()));
        variables.put("taxAmount", formatCurrency(event.taxAmount()));
        variables.put("shippingAmount", formatCurrency(event.shippingAmount()));
        variables.put("discountAmount", formatDiscount(event.discountAmount()));
        variables.put("totalAmount", formatCurrency(event.totalAmount()));
        variables.put("status", event.status());
        variables.put("createdAt", formatTimestamp(event.createdAt()));
        sendNotification(
                event.eventId(),
                EmailTemplateType.ORDER_CONFIRMATION,
                event.customerEmail(),
                "%s order confirmation #%s".formatted(mailProperties.getStoreName(), event.orderId()),
                variables);
    }

    public void handleOrderCancelled(OrderCancelledEvent event) {
        Map<String, Object> variables = baseVariables();
        variables.put("customerName", event.customerName());
        variables.put("orderId", event.orderId());
        variables.put("cancellationReason", event.cancellationReason());
        variables.put("cancelledAt", formatTimestamp(event.cancelledAt()));
        sendNotification(
                event.eventId(),
                EmailTemplateType.ORDER_CANCELLED,
                event.customerEmail(),
                "%s order cancelled #%s".formatted(mailProperties.getStoreName(), event.orderId()),
                variables);
    }

    public void handleLowStock(LowStockEvent event) {
        Map<String, Object> variables = baseVariables();
        variables.put("productName", event.productName());
        variables.put("productId", event.productId());
        variables.put("remainingStock", event.remainingStock());
        variables.put("createdAt", formatTimestamp(event.createdAt()));
        sendNotification(
                event.eventId(),
                EmailTemplateType.LOW_STOCK_ALERT,
                event.adminEmail(),
                "%s low stock alert: %s".formatted(mailProperties.getStoreName(), event.productName()),
                variables);
    }

    private void sendNotification(UUID eventId,
                                  EmailTemplateType templateType,
                                  String recipient,
                                  String subject,
                                  Map<String, Object> variables) {
        if (!StringUtils.hasText(recipient)) {
            log.warn("Skipping notification eventId={} template={} because recipient is missing", eventId, templateType);
            return;
        }

        try {
            log.info("Preparing notification eventId={} template={} recipient={} subject={}", eventId, templateType, recipient, subject);
            String htmlBody = emailTemplateService.renderTemplate(templateType, variables);
            emailService.sendHtmlEmail(recipient, subject, htmlBody);
        } catch (Exception exception) {
            log.error("Notification processing failed eventId={} template={} recipient={} message={}", eventId, templateType, recipient, exception.getMessage(), exception);
        }
    }

    private Map<String, Object> baseVariables() {
        Map<String, Object> variables = new LinkedHashMap<>();
        variables.put("storeName", mailProperties.getStoreName());
        variables.put("supportEmail", mailProperties.getReplyTo());
        variables.put("storefrontBaseUrl", mailProperties.getStorefrontBaseUrl());
        return variables;
    }

    private List<Map<String, Object>> buildOrderLineItems(List<OrderCreatedLineItemEvent> lineItems) {
        if (lineItems == null || lineItems.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> renderedItems = new ArrayList<>();
        for (OrderCreatedLineItemEvent item : lineItems) {
            Map<String, Object> renderedItem = new LinkedHashMap<>();
            renderedItem.put("productId", item.productId());
            renderedItem.put("productName", item.productName());
            renderedItem.put("quantity", item.quantity());
            renderedItem.put("unitPrice", formatCurrency(item.unitPrice()));
            renderedItem.put("lineTotal", formatCurrency(item.lineTotal()));
            renderedItem.put("productImageUrl", buildPlaceholderThumbnail(item.productName(), item.productId()));
            renderedItems.add(renderedItem);
        }
        return renderedItems;
    }

    private String formatTimestamp(LocalDateTime timestamp) {
        return timestamp == null ? "N/A" : timestamp.format(TIMESTAMP_FORMATTER);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "N/A";
        }
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.US);
        return currencyFormat.format(amount);
    }

    private String formatDiscount(BigDecimal amount) {
        if (amount == null) {
            return "N/A";
        }
        if (BigDecimal.ZERO.compareTo(amount) == 0) {
            return formatCurrency(amount);
        }
        return "-" + formatCurrency(amount);
    }

    private String buildPlaceholderThumbnail(String productName, Long productId) {
        String initials = deriveInitials(productName, productId);
        return "https://placehold.co/72x72/eef4ff/0f172a?text="
                + URLEncoder.encode(initials, StandardCharsets.UTF_8);
    }

    private String deriveInitials(String productName, Long productId) {
        if (!StringUtils.hasText(productName)) {
            return productId == null ? "OF" : "P" + productId;
        }

        String[] parts = productName.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            initials.append(Character.toUpperCase(part.charAt(0)));
            if (initials.length() == 2) {
                break;
            }
        }
        return initials.isEmpty() ? "OF" : initials.toString();
    }
}
