package com.orderflow.notification.service;

import com.orderflow.notification.config.NotificationMailProperties;
import com.orderflow.notification.event.LowStockEvent;
import com.orderflow.notification.event.OrderCancelledEvent;
import com.orderflow.notification.event.OrderCreatedEvent;
import com.orderflow.notification.event.OrderCreatedLineItemEvent;
import com.orderflow.notification.template.EmailTemplateService;
import com.orderflow.notification.template.EmailTemplateType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationOrchestratorServiceTest {

    @Mock
    private EmailTemplateService emailTemplateService;

    @Mock
    private EmailService emailService;

    private NotificationOrchestratorService notificationOrchestratorService;

    @BeforeEach
    void setUp() {
        NotificationMailProperties mailProperties = new NotificationMailProperties();
        mailProperties.setStoreName("Oflio Commerce");
        mailProperties.setReplyTo("support@oflio.local");
        mailProperties.setStorefrontBaseUrl("http://localhost:5173");
        notificationOrchestratorService = new NotificationOrchestratorService(emailTemplateService, emailService, mailProperties);
    }

    @Test
    void usesOrderConfirmationTemplateForOrderCreated() {
        when(emailTemplateService.renderTemplate(org.mockito.ArgumentMatchers.eq(EmailTemplateType.ORDER_CONFIRMATION), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn("<html>confirmation</html>");

        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(),
                42L,
                "OFL-20260607-ABC12345",
                "Alex Johnson",
                "alex@example.com",
                BigDecimal.valueOf(229.99),
                BigDecimal.valueOf(18.40),
                BigDecimal.valueOf(12.00),
                BigDecimal.valueOf(10.40),
                BigDecimal.valueOf(249.99),
                "CONFIRMED",
                LocalDateTime.of(2026, 6, 7, 10, 15),
                List.of(new OrderCreatedLineItemEvent(
                        101L,
                        "Nova X5 Smartphone",
                        2,
                        BigDecimal.valueOf(114.995),
                        BigDecimal.valueOf(229.99))));

        notificationOrchestratorService.handleOrderCreated(event);

        ArgumentCaptor<Map<String, Object>> variablesCaptor = ArgumentCaptor.forClass(Map.class);
        verify(emailTemplateService).renderTemplate(org.mockito.ArgumentMatchers.eq(EmailTemplateType.ORDER_CONFIRMATION), variablesCaptor.capture());
        verify(emailService).sendHtmlEmail("alex@example.com", "Oflio Commerce order confirmation OFL-20260607-ABC12345", "<html>confirmation</html>");

        Map<String, Object> variables = variablesCaptor.getValue();
        assertThat(variables).containsEntry("customerName", "Alex Johnson");
        assertThat(variables).containsEntry("orderId", 42L);
        assertThat(variables).containsEntry("orderCode", "OFL-20260607-ABC12345");
        assertThat(variables).containsEntry("status", "CONFIRMED");
        assertThat(variables.get("totalAmount")).isEqualTo("$249.99");
        assertThat(variables.get("subtotalAmount")).isEqualTo("$229.99");
        assertThat(variables.get("taxAmount")).isEqualTo("$18.40");
        assertThat(variables.get("shippingAmount")).isEqualTo("$12.00");
        assertThat(variables.get("discountAmount")).isEqualTo("-$10.40");
        assertThat((List<?>) variables.get("lineItems")).singleElement().satisfies(item -> {
            Map<?, ?> lineItem = (Map<?, ?>) item;
            assertThat(lineItem.get("productName")).isEqualTo("Nova X5 Smartphone");
            assertThat(lineItem.get("quantity")).isEqualTo(2);
            assertThat(lineItem.get("unitPrice")).isEqualTo("$115.00");
            assertThat(lineItem.get("lineTotal")).isEqualTo("$229.99");
            assertThat(lineItem.get("productImageUrl")).asString().contains("placehold.co");
        });
    }

    @Test
    void usesOrderCancelledTemplateForOrderCancelled() {
        when(emailTemplateService.renderTemplate(org.mockito.ArgumentMatchers.eq(EmailTemplateType.ORDER_CANCELLED), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn("<html>cancelled</html>");

        OrderCancelledEvent event = new OrderCancelledEvent(
                UUID.randomUUID(),
                57L,
                "OFL-20260607-CANCEL57",
                "Casey Reed",
                "casey@example.com",
                "Customer requested cancellation",
                LocalDateTime.of(2026, 6, 7, 11, 5));

        notificationOrchestratorService.handleOrderCancelled(event);

        verify(emailService).sendHtmlEmail("casey@example.com", "Oflio Commerce order cancelled OFL-20260607-CANCEL57", "<html>cancelled</html>");
    }

    @Test
    void skipsLowStockWhenAdminRecipientMissing() {
        LowStockEvent event = new LowStockEvent(
                UUID.randomUUID(),
                9L,
                "Nova X5 Smartphone",
                4,
                " ",
                LocalDateTime.of(2026, 6, 7, 12, 0));

        notificationOrchestratorService.handleLowStock(event);

        verify(emailTemplateService, never()).renderTemplate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyMap());
        verify(emailService, never()).sendHtmlEmail(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }
}
