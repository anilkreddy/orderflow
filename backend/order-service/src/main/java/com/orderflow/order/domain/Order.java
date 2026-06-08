package com.orderflow.order.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "orders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    private static final DateTimeFormatter ORDER_CODE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, unique = true, updatable = false, length = 24)
    private String orderCode;

    @Column(nullable = false, length = 120)
    private String customerName;

    @Column(nullable = false, length = 180)
    private String customerEmail;

    @Column(name = "identity_user_id", length = 64)
    private String identityUserId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (orderCode == null || orderCode.isBlank()) {
            orderCode = generateOrderCode(createdAt);
        }
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    private String generateOrderCode(LocalDateTime timestamp) {
        String datePortion = ORDER_CODE_DATE_FORMAT.format(timestamp);
        String randomPortion = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
        return "OFL-" + datePortion + "-" + randomPortion;
    }
}
