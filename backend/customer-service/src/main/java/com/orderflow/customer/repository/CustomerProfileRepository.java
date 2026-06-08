package com.orderflow.customer.repository;

import com.orderflow.customer.domain.CustomerProfile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<CustomerProfile> findByEmailIgnoreCase(String email);

    Optional<CustomerProfile> findByUsernameIgnoreCase(String username);

    Optional<CustomerProfile> findByIdentityUserId(String identityUserId);

    List<CustomerProfile> findByPasswordExpiringNotifiedFalseAndPasswordExpiresAtBetween(LocalDateTime start, LocalDateTime end);

    List<CustomerProfile> findByPasswordExpiredNotifiedFalseAndPasswordExpiresAtLessThanEqual(LocalDateTime cutoff);
}
