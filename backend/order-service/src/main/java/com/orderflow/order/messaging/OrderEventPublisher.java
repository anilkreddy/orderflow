package com.orderflow.order.messaging;

import com.orderflow.order.domain.Order;
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
        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(),
                order.getId(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                order.getTotalAmount(),
                order.getStatus().name(),
                order.getCreatedAt());

        kafkaTemplate.send(orderCreatedTopic, String.valueOf(order.getId()), event);
        log.info("Published Kafka event topic={} orderId={} customerEmail={}",
                orderCreatedTopic,
                order.getId(),
                order.getCustomerEmail());
    }
}
