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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
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
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    private final RestClient restClient;
    private final IdentityAdminProperties properties;

    @Override
    public String createCustomer(CustomerRegistrationRequest request) {
        String configuredGroupId = normalizeGroupId(properties.customerDefaultGroupId());
        String adminToken = obtainAdminToken();
        String identityUserId = null;
        try {
            if (configuredGroupId != null) {
                String createdIdentityUserId = createAndAssignIdentityUserWithCurl(adminToken, request, configuredGroupId);
                log.info("Created identity user username={} identityUserId={} defaultGroup={}",
                        request.username(), createdIdentityUserId, properties.customerDefaultGroupPath());
                return createdIdentityUserId;
            }
            identityUserId = createIdentityUser(adminToken, request);
            addUserToGroup(adminToken, identityUserId, normalizeGroupPath(properties.customerDefaultGroupPath()));
            log.info("Created identity user username={} identityUserId={} defaultGroup={}",
                    request.username(), identityUserId, properties.customerDefaultGroupPath());
            return identityUserId;
        } catch (BusinessException exception) {
            if (configuredGroupId == null) {
                cleanupIdentityUser(adminToken, identityUserId);
            }
            throw exception;
        } catch (Exception exception) {
            if (configuredGroupId == null) {
                cleanupIdentityUser(adminToken, identityUserId);
            }
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
        String formBody = "grant_type=password"
                + "&client_id=" + urlEncode(properties.clientId())
                + "&username=" + urlEncode(properties.username())
                + "&password=" + urlEncode(properties.password());

        try {
            Process process = new ProcessBuilder(
                    "curl",
                    "--http1.1",
                    "-sS",
                    "-H",
                    HttpHeaders.CONTENT_TYPE + ": " + MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                    "-d",
                    formBody,
                    properties.serverUrl() + "/realms/" + properties.adminRealm() + "/protocol/openid-connect/token")
                    .start();

            String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new BusinessException("Identity admin access token request failed: " + (stderr.isBlank() ? stdout : stderr));
            }

            JsonNode response = readJsonResponse(stdout);
            if (response == null || response.path("access_token").asText().isBlank()) {
                throw new BusinessException("Identity admin access token response was empty");
            }
            return response.path("access_token").asText();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Identity admin access token request was interrupted");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("Identity admin access token request failed: " + exception.getMessage());
        }
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String createIdentityUser(String adminToken, CustomerRegistrationRequest request) throws Exception {
        String payload = """
                {
                  "username": %s,
                  "email": %s,
                  "firstName": %s,
                  "lastName": %s,
                  "enabled": true,
                  "emailVerified": false,
                  "credentials": [
                    {
                      "type": "password",
                      "temporary": false,
                      "value": %s
                    }
                  ]
                }
                """.formatted(
                jsonLiteral(request.username()),
                jsonLiteral(request.email()),
                jsonLiteral(request.firstName()),
                jsonLiteral(request.lastName()),
                jsonLiteral(request.password())
        ).trim();

        Process process = new ProcessBuilder(
                "curl",
                "--http1.1",
                "-sS",
                "-X",
                "POST",
                "-D",
                "-",
                "-o",
                "/dev/null",
                "-H",
                HttpHeaders.AUTHORIZATION + ": " + bearer(adminToken),
                "-H",
                HttpHeaders.CONTENT_TYPE + ": " + MediaType.APPLICATION_JSON_VALUE,
                "-d",
                payload,
                adminUri("/users").toString())
                .start();

        String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new BusinessException("Identity user registration failed: " + (stderr.isBlank() ? stdout : stderr));
        }

        String locationHeader = extractHeaderValue(stdout, "location");
        if (locationHeader == null || locationHeader.isBlank()) {
            throw new BusinessException("Identity provider did not return a user location header");
        }

        String path = URI.create(locationHeader).getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }

    private String createAndAssignIdentityUserWithCurl(String adminToken, CustomerRegistrationRequest request, String groupId)
            throws Exception {
        String payload = """
                {"username":%s,"email":%s,"firstName":%s,"lastName":%s,"enabled":true,"emailVerified":false,"credentials":[{"type":"password","temporary":false,"value":%s}]}
                """.formatted(
                jsonLiteral(request.username()),
                jsonLiteral(request.email()),
                jsonLiteral(request.firstName()),
                jsonLiteral(request.lastName()),
                jsonLiteral(request.password())
        ).trim();

        String usersUrl = adminUri("/users").toString();
        String shellScript = """
                set -eu
                headers_file=$(mktemp)
                body_file=$(mktemp)
                create_status=$(curl --http1.1 -sS -D "$headers_file" -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" --data "$PAYLOAD" "$USERS_URL")
                if [ "$create_status" -ge 400 ]; then
                  cat "$headers_file"
                  exit 11
                fi
                user_id=$(sed -n 's#^Location: .*/##p' "$headers_file" | tr -d '\\r')
                if [ -z "$user_id" ]; then
                  exit 12
                fi
                attach_status=$(curl --http1.1 -sS -o "$body_file" -w "%{http_code}" -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" "$USERS_URL/$user_id/groups/$GROUP_ID")
                if [ "$attach_status" -ge 400 ]; then
                  curl --http1.1 -sS -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "$USERS_URL/$user_id" >/dev/null || true
                  cat "$body_file"
                  exit 13
                fi
                printf '%s' "$user_id"
                """;

        ProcessBuilder processBuilder = new ProcessBuilder("sh", "-lc", shellScript);
        processBuilder.environment().put("ADMIN_TOKEN", adminToken);
        processBuilder.environment().put("GROUP_ID", groupId);
        processBuilder.environment().put("PAYLOAD", payload);
        processBuilder.environment().put("USERS_URL", usersUrl);

        Process process = processBuilder.start();
        String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            String failureOutput = stdout.isBlank() ? stderr : stdout;
            if (failureOutput.isBlank()) {
                failureOutput = "curl registration script failed with exit code " + exitCode;
            }
            throw new BusinessException("Identity user registration failed: " + failureOutput);
        }

        return stdout;
    }

    private void addUserToGroup(String adminToken, String identityUserId, String groupPath) throws Exception {
        String configuredGroupId = normalizeGroupId(properties.customerDefaultGroupId());
        String groupId = configuredGroupId != null ? configuredGroupId : resolveGroupIdByPath(adminToken, groupPath);
        attachUserToGroupWithCurl(adminToken, identityUserId, groupId);
    }

    private String resolveGroupIdByPath(String adminToken, String groupPath) {
        String normalizedPath = normalizeGroupPath(groupPath);
        String[] segments = normalizedPath.substring(1).split("/");
        if (segments.length == 0) {
            throw new BusinessException("Identity group path must not be blank");
        }

        String topLevelResponseBody;
        try {
            topLevelResponseBody = restClient.get()
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/groups?briefRepresentation=false")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("Identity groups request failed: " + exception.getResponseBodyAsString());
        }

        if (topLevelResponseBody == null || topLevelResponseBody.isBlank()) {
            throw new BusinessException("Identity groups response was empty for path " + normalizedPath);
        }

        JsonNode topLevelGroups = readJsonResponse(topLevelResponseBody);
        String topLevelPath = "/" + segments[0];
        String topLevelGroupId = null;
        if (topLevelGroups.isArray()) {
            for (JsonNode group : topLevelGroups) {
                topLevelGroupId = groupIdForPath(group, topLevelPath);
                if (topLevelGroupId != null) {
                    break;
                }
            }
        }

        if (topLevelGroupId == null) {
            log.warn("Identity top-level group path not found path={} response={}", normalizedPath, topLevelResponseBody);
            throw new BusinessException("Identity group segment not found for path " + normalizedPath);
        }

        if (segments.length == 1) {
            return topLevelGroupId;
        }

        String childrenResponseBody;
        try {
            childrenResponseBody = restClient.get()
                    .uri(properties.serverUrl() + "/admin/realms/" + properties.realm() + "/groups/" + topLevelGroupId + "/children")
                    .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessException("Identity group children request failed: " + exception.getResponseBodyAsString());
        }

        if (childrenResponseBody == null || childrenResponseBody.isBlank()) {
            throw new BusinessException("Identity group children response was empty for path " + normalizedPath);
        }

        JsonNode childGroups = readJsonResponse(childrenResponseBody);
        if (childGroups.isArray()) {
            for (JsonNode childGroup : childGroups) {
                String childGroupId = groupIdForPath(childGroup, normalizedPath);
                if (childGroupId != null) {
                    return childGroupId;
                }
            }
        }

        log.warn("Identity child group path not found path={} response={}", normalizedPath, childrenResponseBody);
        throw new BusinessException("Identity group segment not found for path " + normalizedPath);
    }

    private String groupIdForPath(JsonNode group, String groupPath) {
        if (group == null || group.isMissingNode() || group.isNull()) {
            return null;
        }
        if (groupPath.equals(group.path("path").asText()) && !group.path("id").asText().isBlank()) {
            return group.path("id").asText();
        }
        return null;
    }

    private String jsonLiteral(String value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("Unable to serialize identity registration payload");
        }
    }

    private HttpResponse<String> sendIdentityRequest(String adminToken, HttpRequest.Builder requestBuilder, String errorPrefix)
            throws Exception {
        HttpRequest request = requestBuilder
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .build();
        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new BusinessException(errorPrefix + response.body());
        }
        return response;
    }

    private JsonNode readJsonResponse(String responseBody) {
        try {
            return OBJECT_MAPPER.readTree(responseBody);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("Unable to parse identity response");
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

    private String normalizeGroupId(String groupId) {
        if (groupId == null) {
            return null;
        }
        String trimmedGroupId = groupId.trim();
        return trimmedGroupId.isEmpty() ? null : trimmedGroupId;
    }

    private void attachUserToGroupWithCurl(String adminToken, String identityUserId, String groupId) throws Exception {
        String lastError = "Identity group assignment failed";
        for (int attempt = 1; attempt <= 5; attempt++) {
            Process process = new ProcessBuilder(
                    "curl",
                    "--http1.1",
                    "-sS",
                    "-X",
                    "PUT",
                    "-H",
                    HttpHeaders.AUTHORIZATION + ": " + bearer(adminToken),
                    "-w",
                    "\n%{http_code}",
                    adminUri("/users/" + identityUserId + "/groups/" + groupId).toString())
                    .start();

            String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                lastError = stderr.isBlank() ? stdout : stderr;
            } else {
                int separatorIndex = stdout.lastIndexOf('\n');
                String body = separatorIndex >= 0 ? stdout.substring(0, separatorIndex).trim() : stdout.trim();
                String statusCodeText = separatorIndex >= 0 ? stdout.substring(separatorIndex + 1).trim() : "";
                if (statusCodeText.isBlank()) {
                    lastError = "missing status code";
                } else {
                    int statusCode = Integer.parseInt(statusCodeText);
                    if (statusCode < 400) {
                        return;
                    }
                    lastError = body;
                    if (!(statusCode == 404 || body.contains("Group not found"))) {
                        break;
                    }
                }
            }

            Thread.sleep(attempt * 250L);
        }

        throw new BusinessException("Identity group assignment failed: " + lastError);
    }

    private String extractHeaderValue(String rawHeaders, String headerName) {
        String prefix = headerName.toLowerCase() + ":";
        for (String line : rawHeaders.split("\\R")) {
            String trimmedLine = line.trim();
            if (trimmedLine.toLowerCase().startsWith(prefix)) {
                return trimmedLine.substring(prefix.length()).trim();
            }
        }
        return null;
    }

    private URI adminUri(String path) {
        return URI.create(properties.serverUrl() + "/admin/realms/" + properties.realm() + path);
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
