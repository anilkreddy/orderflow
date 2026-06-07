package com.orderflow.notification.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderCreatedEvent(
        UUID eventId,
        Long orderId,
        String customerName,
        String customerEmail,
        BigDecimal subtotalAmount,
        BigDecimal taxAmount,
        BigDecimal shippingAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String status,
        LocalDateTime createdAt,
        List<OrderCreatedLineItemEvent> lineItems) {
}
