package com.orderflow.customer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orderflow.customer.config.IdentityAdminProperties;
import com.orderflow.customer.dto.CustomerPasswordChangeRequest;
import com.orderflow.customer.dto.CustomerRegistrationRequest;
import com.orderflow.customer.dto.CustomerUpdateRequest;
import com.orderflow.customer.exception.BusinessException;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
        Map<String, Object> payload = new HashMap<>();
        payload.put("username", request.username());
        payload.put("email", request.email());
        payload.put("firstName", request.firstName());
        payload.put("lastName", request.lastName());
        payload.put("enabled", true);
        payload.put("emailVerified", false);
        payload.put("credentials", List.of(Map.of(
                "type", "password",
                "temporary", false,
                "value", request.password())));

        String identityUserId = null;
        try {
            URI location = restClient.post()
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/users")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .getHeaders()
                    .getLocation();

            if (location == null) {
                throw new BusinessException("Identity provider did not return a user location header");
            }

            String path = location.getPath();
            identityUserId = path.substring(path.lastIndexOf('/') + 1);
            assignCustomerAccess(adminToken, identityUserId);
            log.info("Created identity user username={} identityUserId={}", request.username(), identityUserId);
            return identityUserId;
        } catch (RestClientResponseException exception) {
            cleanupIdentityUser(adminToken, identityUserId);
            throw new BusinessException("Identity user registration failed: " + exception.getResponseBodyAsString());
        } catch (BusinessException exception) {
            cleanupIdentityUser(adminToken, identityUserId);
            throw exception;
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
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/users/" + identityUserId)
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Updated identity user identityUserId={}", identityUserId);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("Identity user update failed: " + exception.getResponseBodyAsString());
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
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/users/" + identityUserId + "/reset-password")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Changed identity password identityUserId={}", identityUserId);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("Identity password update failed: " + exception.getResponseBodyAsString());
        }
    }

    private String obtainAdminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", properties.clientId());
        form.add("username", properties.username());
        form.add("password", properties.password());

        Map<String, Object> response = restClient.post()
                .uri(properties.serverUrl() + "/realms/" + properties.adminRealm() + "/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("access_token") == null) {
            throw new BusinessException("Identity admin access token response was empty");
        }

        return response.get("access_token").toString();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private void assignCustomerAccess(String adminToken, String identityUserId) {
        assignUserToGroup(adminToken, identityUserId, properties.customerDefaultGroupPath());
        log.info("Attached identity group path={} to userId={}", properties.customerDefaultGroupPath(), identityUserId);
    }

    private void assignUserToGroup(String adminToken, String identityUserId, String groupPath) {
        String groupId = findGroupIdByPath(adminToken, groupPath);
        restClient.put()
                .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/users/" + identityUserId + "/groups/" + groupId)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .retrieve()
                .toBodilessEntity();
    }

    @SuppressWarnings("unchecked")
    private String findGroupIdByPath(String adminToken, String groupPath) {
        String normalizedPath = normalizeGroupPath(groupPath);
        String[] segments = normalizedPath.substring(1).split("/");
        String currentGroupId = null;
        StringBuilder currentPath = new StringBuilder();

        for (String segment : segments) {
            currentPath.append('/').append(segment);
            List<Map<String, Object>> groups = currentGroupId == null
                    ? fetchGroups(adminToken, "/admin/realms/" + properties.realm() + "/groups")
                    : fetchGroups(adminToken, "/admin/realms/" + properties.realm() + "/groups/" + currentGroupId + "/children?briefRepresentation=false");

            if (groups == null || groups.isEmpty()) {
                throw new BusinessException("Identity groups response was empty for path " + currentPath);
            }

            Map<String, Object> match = groups.stream()
                    .filter(group -> currentPath.toString().equals(group.get("path")) || segment.equals(group.get("name")))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Identity group segment not found for path " + currentPath));

            currentGroupId = match.get("id").toString();
        }

        return currentGroupId;
    }

    private List<Map<String, Object>> fetchGroups(String adminToken, String uriPath) {
        String payload = restClient.get()
                .uri(properties.serverUrl() + uriPath)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .retrieve()
                .body(String.class);

        if (payload == null || payload.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(payload, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception exception) {
            throw new BusinessException("Unable to parse identity groups response");
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
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/users/" + identityUserId)
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
            throw new BusinessException("Identity user deletion failed: " + exception.getResponseBodyAsString());
        }
    }

    private String normalizeGroupPath(String groupPath) {
        if (groupPath == null || groupPath.isBlank()) {
            throw new BusinessException("Identity group path must not be blank");
        }
        return groupPath.startsWith("/") ? groupPath : "/" + groupPath;
    }
}
