package com.orderflow.customer.service;

import com.orderflow.customer.config.CustomerLifecycleProperties;
import com.orderflow.customer.domain.CustomerProfile;
import com.orderflow.customer.dto.AuthenticatedCustomer;
import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerResponse;
import com.orderflow.customer.dto.CustomerUpdateRequest;
import com.orderflow.customer.event.CustomerDeletedEvent;
import com.orderflow.customer.event.CustomerPasswordChangedEvent;
import com.orderflow.customer.event.CustomerRegisteredEvent;
import com.orderflow.customer.event.CustomerUpsertedEvent;
import com.orderflow.customer.exception.BusinessException;
import com.orderflow.customer.exception.ResourceNotFoundException;
import com.orderflow.customer.repository.CustomerProfileRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerProfileRepository customerProfileRepository;
    private final IdentityAdminService identityAdminService;
    private final CustomerEventPublisher eventPublisher;
    private final CustomerLifecycleProperties lifecycleProperties;

    @Override
    @Transactional
    public CustomerResponse registerCustomer(CustomerRegistrationRequest request) {
        validateUniqueCustomer(request.username(), request.email(), null);

        String identityUserId = identityAdminService.createCustomer(request);
        LocalDateTime now = LocalDateTime.now();
        CustomerProfile profile = customerProfileRepository.save(CustomerProfile.builder()
                .identityUserId(identityUserId)
                .username(normalizeUsername(request.username()))
                .email(normalizeEmail(request.email()))
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .enabled(true)
                .emailVerified(false)
                .registeredAt(now)
                .passwordChangedAt(now)
                .passwordExpiresAt(now.plusDays(lifecycleProperties.password().validityDays()))
                .passwordExpiringNotified(false)
                .passwordExpiredNotified(false)
                .build());

        eventPublisher.publishCustomerRegistered(new CustomerRegisteredEvent(
                UUID.randomUUID(),
                profile.getId(),
                profile.getIdentityUserId(),
                profile.getUsername(),
                profile.getEmail(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getRegisteredAt(),
                now));
        eventPublisher.publishCustomerUpserted(buildUpsertedEvent(profile));

        log.info("Registered customer id={} email={}", profile.getId(), profile.getEmail());
        return toResponse(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerResponse> getCustomers() {
        return customerProfileRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomer(UUID customerId) {
        return toResponse(getProfile(customerId));
    }

    @Override
    @Transactional
    public CustomerResponse getCurrentCustomer(AuthenticatedCustomer authenticatedCustomer) {
        String identityUserId = requireValue(authenticatedCustomer.identityUserId(), "Signed-in identity is missing a subject");
        String email = normalizeEmail(requireValue(authenticatedCustomer.email(), "Signed-in identity is missing an email address"));
        String username = normalizeUsername(defaultValue(authenticatedCustomer.username(), email));

        CustomerProfile profile = customerProfileRepository.findByIdentityUserId(identityUserId)
                .or(() -> customerProfileRepository.findByEmailIgnoreCase(email))
                .or(() -> customerProfileRepository.findByUsernameIgnoreCase(username))
                .map(existing -> synchronizeProfile(existing, authenticatedCustomer, identityUserId, username, email))
                .orElseGet(() -> createProfile(authenticatedCustomer, identityUserId, username, email));

        return toResponse(profile);
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(UUID customerId, CustomerUpdateRequest request) {
        CustomerProfile profile = getProfile(customerId);
        validateUniqueCustomer(request.username(), request.email(), customerId);

        identityAdminService.updateCustomer(profile.getIdentityUserId(), request);

        profile.setUsername(normalizeUsername(request.username()));
        profile.setEmail(normalizeEmail(request.email()));
        profile.setFirstName(request.firstName().trim());
        profile.setLastName(request.lastName().trim());
        profile.setEnabled(request.enabled());
        profile.setEmailVerified(request.emailVerified());

        CustomerProfile saved = customerProfileRepository.save(profile);
        eventPublisher.publishCustomerUpserted(buildUpsertedEvent(saved));

        log.info("Updated customer id={} email={}", saved.getId(), saved.getEmail());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteCustomer(UUID customerId) {
        CustomerProfile profile = getProfile(customerId);
        identityAdminService.deleteCustomer(profile.getIdentityUserId());
        customerProfileRepository.delete(profile);
        eventPublisher.publishCustomerDeleted(new CustomerDeletedEvent(
                UUID.randomUUID(),
                profile.getId(),
                profile.getIdentityUserId(),
                profile.getUsername(),
                profile.getEmail(),
                LocalDateTime.now()));

        log.info("Deleted customer id={} email={}", profile.getId(), profile.getEmail());
    }

    @Override
    @Transactional
    public void changePassword(UUID customerId, CustomerPasswordChangeRequest request) {
        CustomerProfile profile = getProfile(customerId);
        identityAdminService.changePassword(profile.getIdentityUserId(), request);

        LocalDateTime changedAt = LocalDateTime.now();
        profile.setPasswordChangedAt(changedAt);
        profile.setPasswordExpiresAt(changedAt.plusDays(lifecycleProperties.password().validityDays()));
        profile.setPasswordExpiringNotified(false);
        profile.setPasswordExpiredNotified(false);
        customerProfileRepository.save(profile);

        eventPublisher.publishCustomerPasswordChanged(new CustomerPasswordChangedEvent(
                UUID.randomUUID(),
                profile.getId(),
                profile.getIdentityUserId(),
                profile.getEmail(),
                changedAt,
                profile.getPasswordExpiresAt()));

        log.info("Changed password for customer id={} email={}", profile.getId(), profile.getEmail());
    }

    private CustomerProfile getProfile(UUID customerId) {
        return customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private CustomerProfile createProfile(
            AuthenticatedCustomer authenticatedCustomer,
            String identityUserId,
            String username,
            String email) {
        LocalDateTime now = LocalDateTime.now();
        CustomerProfile profile = customerProfileRepository.save(CustomerProfile.builder()
                .identityUserId(identityUserId)
                .username(username)
                .email(email)
                .firstName(defaultValue(authenticatedCustomer.firstName(), "Customer"))
                .lastName(defaultValue(authenticatedCustomer.lastName(), ""))
                .enabled(true)
                .emailVerified(authenticatedCustomer.emailVerified())
                .registeredAt(now)
                .passwordChangedAt(now)
                .passwordExpiresAt(now.plusDays(lifecycleProperties.password().validityDays()))
                .passwordExpiringNotified(false)
                .passwordExpiredNotified(false)
                .build());

        eventPublisher.publishCustomerUpserted(buildUpsertedEvent(profile));
        log.info("Created customer profile from signed-in identity id={} email={}", profile.getId(), profile.getEmail());
        return profile;
    }

    private CustomerProfile synchronizeProfile(
            CustomerProfile profile,
            AuthenticatedCustomer authenticatedCustomer,
            String identityUserId,
            String username,
            String email) {
        String firstName = defaultValue(authenticatedCustomer.firstName(), profile.getFirstName());
        String lastName = defaultValue(authenticatedCustomer.lastName(), profile.getLastName());
        boolean changed = !Objects.equals(profile.getIdentityUserId(), identityUserId)
                || !Objects.equals(profile.getUsername(), username)
                || !Objects.equals(profile.getEmail(), email)
                || !Objects.equals(profile.getFirstName(), firstName)
                || !Objects.equals(profile.getLastName(), lastName)
                || !Boolean.TRUE.equals(profile.getEnabled())
                || !Objects.equals(profile.getEmailVerified(), authenticatedCustomer.emailVerified());

        if (!changed) {
            return profile;
        }

        profile.setIdentityUserId(identityUserId);
        profile.setUsername(username);
        profile.setEmail(email);
        profile.setFirstName(firstName);
        profile.setLastName(lastName);
        profile.setEnabled(true);
        profile.setEmailVerified(authenticatedCustomer.emailVerified());

        CustomerProfile saved = customerProfileRepository.save(profile);
        eventPublisher.publishCustomerUpserted(buildUpsertedEvent(saved));
        return saved;
    }

    private void validateUniqueCustomer(String username, String email, UUID existingCustomerId) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);

        if (existingCustomerId == null) {
            if (customerProfileRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
                throw new BusinessException("Customer username already exists");
            }
            if (customerProfileRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                throw new BusinessException("Customer email already exists");
            }
            return;
        }

        customerProfileRepository.findById(existingCustomerId).ifPresent(existing -> {
            customerProfileRepository.findByEmailIgnoreCase(normalizedEmail)
                    .filter(other -> !other.getId().equals(existing.getId()))
                    .ifPresent(other -> {
                        throw new BusinessException("Customer email already exists");
                    });

            customerProfileRepository.findByUsernameIgnoreCase(normalizedUsername)
                    .filter(other -> !other.getId().equals(existing.getId()))
                    .ifPresent(other -> {
                        throw new BusinessException("Customer username already exists");
                    });
        });
    }

    private CustomerUpsertedEvent buildUpsertedEvent(CustomerProfile profile) {
        return new CustomerUpsertedEvent(
                UUID.randomUUID(),
                profile.getId(),
                profile.getIdentityUserId(),
                profile.getUsername(),
                profile.getEmail(),
                profile.getFirstName(),
                profile.getLastName(),
                Boolean.TRUE.equals(profile.getEnabled()),
                Boolean.TRUE.equals(profile.getEmailVerified()),
                profile.getUpdatedAt());
    }

    private CustomerResponse toResponse(CustomerProfile profile) {
        return new CustomerResponse(
                profile.getId(),
                profile.getIdentityUserId(),
                profile.getUsername(),
                profile.getEmail(),
                profile.getFirstName(),
                profile.getLastName(),
                Boolean.TRUE.equals(profile.getEnabled()),
                Boolean.TRUE.equals(profile.getEmailVerified()),
                profile.getRegisteredAt(),
                profile.getPasswordChangedAt(),
                profile.getPasswordExpiresAt(),
                profile.getUpdatedAt());
    }

    private String normalizeUsername(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String requireValue(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(message);
        }
        return value.trim();
    }

    private String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
