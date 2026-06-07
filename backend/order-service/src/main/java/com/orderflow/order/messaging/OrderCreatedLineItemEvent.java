package com.orderflow.order.messaging;

import java.math.BigDecimal;

public record OrderCreatedLineItemEvent(
        Long productId,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal) {
}
