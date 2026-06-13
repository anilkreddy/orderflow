package com.orderflow.customer.service;

import com.orderflow.customer.config.CustomerLifecycleProperties;
import com.orderflow.customer.domain.CustomerProfile;
import com.orderflow.customer.dto.AuthenticatedCustomer;
import com.orderflow.customer.dto.CustomerResponse;
import com.orderflow.customer.event.CustomerUpsertedEvent;
import com.orderflow.customer.repository.CustomerProfileRepository;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerProfileRepository customerProfileRepository;

    @Mock
    private IdentityAdminService identityAdminService;

    @Mock
    private CustomerEventPublisher eventPublisher;

    @Captor
    private ArgumentCaptor<CustomerProfile> profileCaptor;

    @Test
    void createsProfileForExistingSignedInIdentity() {
        CustomerLifecycleProperties lifecycleProperties = new CustomerLifecycleProperties(
                new CustomerLifecycleProperties.PasswordProperties(90, 7),
                new CustomerLifecycleProperties.PasswordEventCheckProperties(true, Duration.ofHours(6)));
        CustomerServiceImpl customerService = new CustomerServiceImpl(
                customerProfileRepository,
                identityAdminService,
                eventPublisher,
                lifecycleProperties);

        when(customerProfileRepository.findByIdentityUserId("identity-123")).thenReturn(Optional.empty());
        when(customerProfileRepository.findByEmailIgnoreCase("customer@oflio.local")).thenReturn(Optional.empty());
        when(customerProfileRepository.findByUsernameIgnoreCase("customer@oflio.local")).thenReturn(Optional.empty());
        when(customerProfileRepository.save(any(CustomerProfile.class))).thenAnswer(invocation -> {
            CustomerProfile profile = invocation.getArgument(0);
            profile.setId(UUID.fromString("8b576230-549f-4b84-b9e7-7e3e75975681"));
            return profile;
        });

        CustomerResponse response = customerService.getCurrentCustomer(new AuthenticatedCustomer(
                "identity-123",
                "customer@oflio.local",
                "customer@oflio.local",
                "Maya",
                "Patel",
                true));

        verify(customerProfileRepository).save(profileCaptor.capture());
        verify(eventPublisher).publishCustomerUpserted(any(CustomerUpsertedEvent.class));
        verifyNoInteractions(identityAdminService);
        assertThat(profileCaptor.getValue())
                .extracting(
                        CustomerProfile::getIdentityUserId,
                        CustomerProfile::getUsername,
                        CustomerProfile::getEmail,
                        CustomerProfile::getFirstName,
                        CustomerProfile::getLastName,
                        CustomerProfile::getEmailVerified)
                .containsExactly(
                        "identity-123",
                        "customer@oflio.local",
                        "customer@oflio.local",
                        "Maya",
                        "Patel",
                        true);
        assertThat(response.id()).isEqualTo(UUID.fromString("8b576230-549f-4b84-b9e7-7e3e75975681"));
    }
}
