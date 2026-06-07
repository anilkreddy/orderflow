package com.orderflow.order.messaging;

import com.orderflow.order.domain.Order;
import com.orderflow.order.domain.OrderItem;
import com.orderflow.order.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderEventPublisherTest {

    @Mock
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    private OrderEventPublisher orderEventPublisher;

    @BeforeEach
    void setUp() {
        orderEventPublisher = new OrderEventPublisher(kafkaTemplate);
        ReflectionTestUtils.setField(orderEventPublisher, "orderCreatedTopic", "order.created");
    }

    @Test
    void publishesOrderCreatedEventWithLineItemsAndSummary() {
        Order order = Order.builder()
                .id(42L)
                .customerName("Alex Johnson")
                .customerEmail("alex@example.com")
                .totalAmount(BigDecimal.valueOf(249.99))
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.of(2026, 6, 7, 10, 15))
                .build();

        order.addItem(OrderItem.builder()
                .productId(101L)
                .productName("Nova X5 Smartphone")
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(124.995))
                .build());

        orderEventPublisher.publishOrderCreated(order);

        ArgumentCaptor<OrderCreatedEvent> eventCaptor = ArgumentCaptor.forClass(OrderCreatedEvent.class);
        verify(kafkaTemplate).send(org.mockito.ArgumentMatchers.eq("order.created"), org.mockito.ArgumentMatchers.eq("42"), eventCaptor.capture());

        OrderCreatedEvent event = eventCaptor.getValue();
        assertThat(event.orderId()).isEqualTo(42L);
        assertThat(event.customerEmail()).isEqualTo("alex@example.com");
        assertThat(event.subtotalAmount()).isEqualTo(BigDecimal.valueOf(249.99));
        assertThat(event.taxAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(event.shippingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(event.discountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(event.lineItems()).singleElement().satisfies(lineItem -> {
            assertThat(lineItem.productId()).isEqualTo(101L);
            assertThat(lineItem.productName()).isEqualTo("Nova X5 Smartphone");
            assertThat(lineItem.quantity()).isEqualTo(2);
            assertThat(lineItem.lineTotal()).isEqualByComparingTo(BigDecimal.valueOf(249.99));
        });
    }
}
