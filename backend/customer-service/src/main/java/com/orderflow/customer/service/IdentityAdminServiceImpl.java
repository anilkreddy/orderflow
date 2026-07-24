package com.orderflow.customer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orderflow.customer.config.IdentityAdminProperties;
import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerUpdateRequest;
import com.orderflow.customer.exception.BusinessException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdentityAdminServiceImpl implements IdentityAdminService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestClient restClient;
    private final IdentityAdminProperties properties;

    @Override
    public String createCustomer(CustomerRegistrationRequest request) {
        String adminToken = obtainAdminToken();
        String identityUserId = null;
        try {
            String customerGroupPath = normalizeGroupPath(properties.customerDefaultGroupPath());
            String customerGroupId = requireGroupId(properties.customerDefaultGroupId());
            identityUserId = createIdentityUser(adminToken, request);
            attachUserToGroup(adminToken, identityUserId, customerGroupId);
            log.info("Created identity user username={} identityUserId={} defaultGroup={}",
                    request.username(), identityUserId, customerGroupPath);
            return identityUserId;
        } catch (BusinessException exception) {
            cleanupIdentityUser(adminToken, identityUserId);
            throw exception;
        } catch (Exception exception) {
            cleanupIdentityUser(adminToken, identityUserId);
            throw new BusinessException("Identity user registration failed: " + exception.getMessage());
        }
    }

    @Override
    public void updateCustomer(String identityUserId, CustomerUpdateRequest request) {
        String adminToken = obtainAdminToken();
        Map<String, Object> payload = Map.of(
                "username", request.username(),
                "email", request.email(),
                "firstName", request.firstName(),
                "lastName", request.lastName(),
                "enabled", request.enabled(),
                "emailVerified", request.emailVerified());

        try {
            restClient.put()
                    .uri(adminUri("/users/" + identityUserId))
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Updated identity user identityUserId={}", identityUserId);
        } catch (RestClientResponseException exception) {
            throw identityFailure("Identity user update failed", exception);
        }
    }

    @Override
    public void deleteCustomer(String identityUserId) {
        String adminToken = obtainAdminToken();
        deleteIdentityUser(adminToken, identityUserId, false);
    }

    @Override
    public void changePassword(String identityUserId, CustomerPasswordChangeRequest request) {
        String adminToken = obtainAdminToken();
        Map<String, Object> payload = Map.of(
                "type", "password",
                "temporary", false,
                "value", request.newPassword());

        try {
            restClient.put()
                    .uri(adminUri("/users/" + identityUserId + "/reset-password"))
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Changed identity password identityUserId={}", identityUserId);
        } catch (RestClientResponseException exception) {
            throw identityFailure("Identity password update failed", exception);
        }
    }

    private String obtainAdminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", properties.clientId());
        form.add("username", properties.username());
        form.add("password", properties.password());

        try {
            String responseBody = restClient.post()
                    .uri(properties.serverUrl() + "/realms/" + properties.adminRealm() + "/protocol/openid-connect/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
            JsonNode response = readJsonResponse(responseBody);
            String accessToken = response.path("access_token").asText();
            if (accessToken.isBlank()) {
                throw new BusinessException("Identity admin access token response was empty");
            }
            return accessToken;
        } catch (RestClientResponseException exception) {
            throw identityFailure("Identity admin access token request failed", exception);
        }
    }

    private String createIdentityUser(String adminToken, CustomerRegistrationRequest request) {
        Map<String, Object> credential = Map.of(
                "type", "password",
                "temporary", false,
                "value", request.password());
        Map<String, Object> payload = Map.of(
                "username", request.username(),
                "email", request.email(),
                "firstName", request.firstName(),
                "lastName", request.lastName(),
                "enabled", true,
                "emailVerified", false,
                "credentials", List.of(credential));

        try {
            ResponseEntity<Void> response = restClient.post()
                    .uri(adminUri("/users"))
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            URI location = response.getHeaders().getLocation();
            if (location == null) {
                throw new BusinessException("Identity provider did not return a user location header");
            }
            String path = location.getPath();
            String identityUserId = path.substring(path.lastIndexOf('/') + 1);
            if (identityUserId.isBlank()) {
                throw new BusinessException("Identity provider returned an invalid user location header");
            }
            return identityUserId;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 409) {
                throw new BusinessException("An account already exists with this username or email");
            }
            throw identityFailure("Identity user registration failed", exception);
        }
    }

    private void attachUserToGroup(String adminToken, String identityUserId, String groupId) {
        try {
            restClient.put()
                    .uri(adminUri("/users/" + identityUserId + "/groups/" + groupId))
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw identityFailure("Identity group assignment failed", exception);
        }
    }

    private void cleanupIdentityUser(String adminToken, String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            return;
        }
        deleteIdentityUser(adminToken, identityUserId, true);
    }

    private void deleteIdentityUser(String adminToken, String identityUserId, boolean silent) {
        try {
            restClient.delete()
                    .uri(adminUri("/users/" + identityUserId))
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .retrieve()
                    .toBodilessEntity();
            if (!silent) {
                log.info("Deleted identity user identityUserId={}", identityUserId);
            }
        } catch (RestClientResponseException exception) {
            if (silent) {
                log.warn("Failed to cleanup identity user identityUserId={} status={} body={}",
                        identityUserId, exception.getStatusCode(), exception.getResponseBodyAsString());
                return;
            }
            throw identityFailure("Identity user deletion failed", exception);
        }
    }

    private BusinessException identityFailure(String prefix, RestClientResponseException exception) {
        return new BusinessException(prefix + ": " + identityResponseMessage(exception));
    }

    private JsonNode readJsonResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new BusinessException("Identity provider returned an empty response");
        }
        try {
            return OBJECT_MAPPER.readTree(responseBody);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("Unable to parse identity provider response");
        }
    }

    private String identityResponseMessage(RestClientResponseException exception) {
        String responseBody = exception.getResponseBodyAsString();
        if (responseBody == null || responseBody.isBlank()) {
            return exception.getStatusText();
        }
        try {
            JsonNode response = OBJECT_MAPPER.readTree(responseBody);
            String message = response.path("errorMessage").asText();
            if (message.isBlank()) {
                message = response.path("error_description").asText();
            }
            if (message.isBlank()) {
                message = response.path("error").asText();
            }
            return message.isBlank() ? responseBody : message;
        } catch (JsonProcessingException parsingException) {
            return responseBody;
        }
    }

    private String normalizeGroupPath(String groupPath) {
        if (groupPath == null || groupPath.isBlank()) {
            throw new BusinessException("Identity group path must not be blank");
        }
        return groupPath.startsWith("/") ? groupPath : "/" + groupPath;
    }

    private String requireGroupId(String groupId) {
        if (groupId == null || groupId.isBlank()) {
            throw new BusinessException("Identity group ID must not be blank");
        }
        return groupId.trim();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private URI adminUri(String path) {
        return URI.create(properties.serverUrl() + "/admin/realms/" + properties.targetRealm() + path);
    }
}
