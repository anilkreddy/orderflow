package com.orderflow.order.messaging;

import com.orderflow.order.domain.Order;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    @Value("${application.kafka.order-created-topic}")
    private String orderCreatedTopic;

    public void publishOrderCreated(Order order) {
        List<OrderCreatedLineItemEvent> lineItems = order.getItems().stream()
                .map(item -> new OrderCreatedLineItemEvent(
                        item.getProductId(),
                        item.getProductName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))))
                .toList();

        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(),
                order.getId(),
                order.getOrderCode(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                order.getTotalAmount(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                order.getTotalAmount(),
                order.getStatus().name(),
                order.getCreatedAt(),
                lineItems);

        kafkaTemplate.send(orderCreatedTopic, String.valueOf(order.getId()), event);
        log.info("Published Kafka event topic={} orderId={} orderCode={} customerEmail={}",
                orderCreatedTopic,
                order.getId(),
                order.getOrderCode(),
                order.getCustomerEmail());
    }
}
