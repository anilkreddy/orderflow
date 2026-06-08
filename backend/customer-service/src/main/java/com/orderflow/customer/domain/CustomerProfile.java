package com.orderflow.customer.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customer_profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerProfile {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "identity_user_id", nullable = false, unique = true, length = 64)
    private String identityUserId;

    @Column(nullable = false, unique = true, length = 120)
    private String username;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(nullable = false)
    private Boolean emailVerified;

    @Column(nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    @Column(nullable = false)
    private LocalDateTime passwordChangedAt;

    @Column(nullable = false)
    private LocalDateTime passwordExpiresAt;

    @Column(nullable = false)
    private Boolean passwordExpiringNotified;

    @Column(nullable = false)
    private Boolean passwordExpiredNotified;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (registeredAt == null) {
            registeredAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
