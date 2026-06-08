package com.orderflow.customer.service;

import com.orderflow.customer.config.CustomerLifecycleProperties;
import com.orderflow.customer.domain.CustomerProfile;
import com.orderflow.customer.event.CustomerPasswordExpiredEvent;
import com.orderflow.customer.event.CustomerPasswordExpiringEvent;
import com.orderflow.customer.repository.CustomerProfileRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomerPasswordLifecycleMonitor {

    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerEventPublisher eventPublisher;
    private final CustomerLifecycleProperties lifecycleProperties;

    @Scheduled(fixedDelayString = "${orderflow.customer.password-event-check.fixed-delay:PT6H}")
    @Transactional
    public void publishPasswordLifecycleEvents() {
        if (!lifecycleProperties.passwordEventCheck().enabled()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiringCutoff = now.plusDays(lifecycleProperties.password().expiringWindowDays());

        List<CustomerProfile> expiringProfiles = customerProfileRepository
                .findByPasswordExpiringNotifiedFalseAndPasswordExpiresAtBetween(now, expiringCutoff);
        for (CustomerProfile profile : expiringProfiles) {
            long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(now.toLocalDate(), profile.getPasswordExpiresAt().toLocalDate()));
            eventPublisher.publishCustomerPasswordExpiring(new CustomerPasswordExpiringEvent(
                    UUID.randomUUID(),
                    profile.getId(),
                    profile.getIdentityUserId(),
                    profile.getEmail(),
                    profile.getPasswordExpiresAt(),
                    daysRemaining,
                    now));
            profile.setPasswordExpiringNotified(true);
        }

        List<CustomerProfile> expiredProfiles = customerProfileRepository
                .findByPasswordExpiredNotifiedFalseAndPasswordExpiresAtLessThanEqual(now);
        for (CustomerProfile profile : expiredProfiles) {
            eventPublisher.publishCustomerPasswordExpired(new CustomerPasswordExpiredEvent(
                    UUID.randomUUID(),
                    profile.getId(),
                    profile.getIdentityUserId(),
                    profile.getEmail(),
                    profile.getPasswordExpiresAt(),
                    now));
            profile.setPasswordExpiredNotified(true);
        }

        if (!expiringProfiles.isEmpty() || !expiredProfiles.isEmpty()) {
            customerProfileRepository.saveAll(expiringProfiles);
            customerProfileRepository.saveAll(expiredProfiles);
            log.info("Processed customer password lifecycle events expiring={} expired={}", expiringProfiles.size(), expiredProfiles.size());
        }
    }
}
