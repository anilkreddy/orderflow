package com.orderflow.customer.service;

import com.orderflow.customer.config.IdentityAdminProperties;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.exception.BusinessException;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withCreatedEntity;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;

class IdentityAdminServiceImplTest {

    private static final String SERVER_URL = "http://identity.test";
    private static final String USER_ID = "identity-123";
    private static final String REGISTERED_GROUP_ID = "registered-group";
    private MockRestServiceServer server;
    private IdentityAdminServiceImpl identityAdminService;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        identityAdminService = new IdentityAdminServiceImpl(
                builder.build(),
                new IdentityAdminProperties(
                        SERVER_URL,
                        "master",
                        "oflio",
                        "admin",
                        "admin",
                        "admin-cli",
                        "/customers/registered",
                        REGISTERED_GROUP_ID));
    }

    @Test
    void createsIdentityUserAndAssignsCustomerGroup() {
        expectAdminToken();
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer admin-token"))
                .andExpect(jsonPath("$.credentials[0].type").value("password"))
                .andRespond(withCreatedEntity(URI.create(SERVER_URL + "/admin/realms/oflio/users/" + USER_ID)));
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users/" + USER_ID + "/groups/" + REGISTERED_GROUP_ID))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer admin-token"))
                .andRespond(withNoContent());

        String identityUserId = identityAdminService.createCustomer(registrationRequest());

        assertThat(identityUserId).isEqualTo(USER_ID);
        server.verify();
    }

    @Test
    void returnsFriendlyMessageWhenIdentityAlreadyExists() {
        expectAdminToken();
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"errorMessage\":\"User exists with same username\"}"));

        assertThatThrownBy(() -> identityAdminService.createCustomer(registrationRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("An account already exists with this username or email");

        server.verify();
    }

    @Test
    void deletesIdentityUserWhenGroupAssignmentFails() {
        expectAdminToken();
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withCreatedEntity(URI.create(SERVER_URL + "/admin/realms/oflio/users/" + USER_ID)));
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users/" + USER_ID + "/groups/" + REGISTERED_GROUP_ID))
                .andExpect(method(HttpMethod.PUT))
                .andRespond(withStatus(NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"Group not found\"}"));
        server.expect(once(), requestTo(SERVER_URL + "/admin/realms/oflio/users/" + USER_ID))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withNoContent());

        assertThatThrownBy(() -> identityAdminService.createCustomer(registrationRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Identity group assignment failed: Group not found");

        server.verify();
    }

    private void expectAdminToken() {
        server.expect(once(), requestTo(SERVER_URL + "/realms/master/protocol/openid-connect/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"access_token\":\"admin-token\"}", MediaType.APPLICATION_JSON));
    }

    private CustomerRegistrationRequest registrationRequest() {
        return new CustomerRegistrationRequest(
                "maya.patel",
                "maya@example.com",
                "Maya",
                "Patel",
                "Customer123!");
    }
}
