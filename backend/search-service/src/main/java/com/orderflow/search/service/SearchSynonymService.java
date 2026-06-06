package com.orderflow.search.service;

import com.orderflow.search.config.SearchTuningProperties;
import com.orderflow.search.dto.SearchSynonymRequest;
import com.orderflow.search.dto.SearchSynonymResponse;
import com.orderflow.search.exception.BusinessException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
public class SearchSynonymService {

    private static final String CONFIG_DOCUMENT_TYPE = "catalog-synonyms";
    private static final int MAX_GROUP_TERMS = 12;

    private final RestClient openSearchRestClient;
    private final ObjectMapper objectMapper;
    private final SearchTuningProperties tuningProperties;

    @Value("${application.search.index.settings-name:search_config_v1}")
    private String settingsIndexName;

    @Value("${application.search.index.settings-document-id:catalog-synonyms}")
    private String settingsDocumentId;

    private volatile boolean configReady;
    private volatile SearchSynonymCatalogDocument cachedDocument;

    public SearchSynonymService(@Qualifier("openSearchRestClient") RestClient openSearchRestClient,
                                ObjectMapper objectMapper,
                                SearchTuningProperties tuningProperties) {
        this.openSearchRestClient = openSearchRestClient;
        this.objectMapper = objectMapper;
        this.tuningProperties = tuningProperties;
    }

    public List<SearchSynonymResponse> listSynonyms() {
        return getCurrentGroups().stream()
                .map(SearchSynonymGroup::toResponse)
                .toList();
    }

    public List<String> listSynonymExpressions() {
        return getCurrentGroups().stream()
                .map(group -> String.join(", ", group.terms()))
                .toList();
    }

    public SearchSynonymResponse createSynonym(SearchSynonymRequest request) {
        List<String> normalizedTerms = normalizeTerms(request);
        SearchSynonymCatalogDocument current = getCurrentDocument();
        ensureNoSharedTerms(current.groups(), normalizedTerms, null);

        LocalDateTime now = LocalDateTime.now();
        List<SearchSynonymGroup> updatedGroups = new ArrayList<>(current.groups());
        SearchSynonymGroup group = new SearchSynonymGroup(
                UUID.randomUUID().toString(),
                normalizedTerms,
                now.toString(),
                now.toString());
        updatedGroups.add(0, group);
        persistDocument(new SearchSynonymCatalogDocument(CONFIG_DOCUMENT_TYPE, updatedGroups, now.toString()));
        log.info("Created synonym group synonymId={} primaryTerm={} termCount={}", group.id(), group.primaryTerm(), group.terms().size());
        return group.toResponse();
    }

    public SearchSynonymResponse updateSynonym(String synonymId, SearchSynonymRequest request) {
        if (synonymId == null || synonymId.isBlank()) {
            throw new BusinessException("Synonym group id is required");
        }

        List<String> normalizedTerms = normalizeTerms(request);
        SearchSynonymCatalogDocument current = getCurrentDocument();
        SearchSynonymGroup existing = current.groups().stream()
                .filter(group -> group.id().equals(synonymId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Synonym group not found"));
        ensureNoSharedTerms(current.groups(), normalizedTerms, synonymId);

        LocalDateTime now = LocalDateTime.now();
        List<SearchSynonymGroup> updatedGroups = current.groups().stream()
                .map(group -> group.id().equals(synonymId)
                        ? new SearchSynonymGroup(group.id(), normalizedTerms, group.createdAt(), now.toString())
                        : group)
                .toList();
        persistDocument(new SearchSynonymCatalogDocument(CONFIG_DOCUMENT_TYPE, updatedGroups, now.toString()));
        log.info("Updated synonym group synonymId={} previousPrimaryTerm={} newPrimaryTerm={}", synonymId, existing.primaryTerm(), normalizedTerms.getFirst());
        return updatedGroups.stream()
                .filter(group -> group.id().equals(synonymId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Synonym group not found after update"))
                .toResponse();
    }

    public void deleteSynonym(String synonymId) {
        if (synonymId == null || synonymId.isBlank()) {
            throw new BusinessException("Synonym group id is required");
        }

        SearchSynonymCatalogDocument current = getCurrentDocument();
        boolean exists = current.groups().stream().anyMatch(group -> group.id().equals(synonymId));
        if (!exists) {
            throw new BusinessException("Synonym group not found");
        }

        LocalDateTime now = LocalDateTime.now();
        List<SearchSynonymGroup> updatedGroups = current.groups().stream()
                .filter(group -> !group.id().equals(synonymId))
                .toList();
        persistDocument(new SearchSynonymCatalogDocument(CONFIG_DOCUMENT_TYPE, updatedGroups, now.toString()));
        log.info("Deleted synonym group synonymId={}", synonymId);
    }

    public List<String> resolveExpandedTerms(String query) {
        String normalizedQuery = normalizePhrase(query);
        if (normalizedQuery == null) {
            return List.of();
        }

        Set<String> expansions = new LinkedHashSet<>();
        for (SearchSynonymGroup group : getCurrentGroups()) {
            boolean matchesGroup = group.terms().stream().anyMatch(term -> queryMatchesTerm(normalizedQuery, term));
            if (!matchesGroup) {
                continue;
            }
            for (String term : group.terms()) {
                if (!term.equals(normalizedQuery)) {
                    expansions.add(term);
                }
            }
        }
        return List.copyOf(expansions);
    }

    private synchronized SearchSynonymCatalogDocument getCurrentDocument() {
        ensureConfigurationReady();
        return cachedDocument;
    }

    private List<SearchSynonymGroup> getCurrentGroups() {
        return getCurrentDocument().groups();
    }

    private synchronized void ensureConfigurationReady() {
        if (configReady && cachedDocument != null) {
            return;
        }

        ensureSettingsIndexExists();
        SearchSynonymCatalogDocument document = loadDocument();
        if (document == null) {
            document = seedDocument();
            persistDocument(document);
            log.info("Seeded search synonym catalog groups={} index={}", document.groups().size(), settingsIndexName);
        } else {
            cachedDocument = document;
        }
        configReady = true;
    }

    private void ensureSettingsIndexExists() {
        if (resourceExists("/{index}", settingsIndexName)) {
            return;
        }

        openSearchRestClient.put()
                .uri("/{index}", settingsIndexName)
                .body(buildSettingsIndexDefinition())
                .retrieve()
                .toBodilessEntity();
        log.info("Created search configuration index index={}", settingsIndexName);
    }

    private SearchSynonymCatalogDocument loadDocument() {
        try {
            JsonNode response = openSearchRestClient.get()
                    .uri("/{index}/_doc/{id}", settingsIndexName, settingsDocumentId)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || !response.path("found").asBoolean(true)) {
                return null;
            }
            JsonNode source = response.path("_source");
            if (source.isMissingNode()) {
                return null;
            }
            return objectMapper.treeToValue(source, SearchSynonymCatalogDocument.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return null;
            }
            throw new BusinessException("Unable to load synonym configuration", exception);
        } catch (RestClientException exception) {
            throw new BusinessException("Unable to load synonym configuration", exception);
        }
    }

    private SearchSynonymCatalogDocument seedDocument() {
        LocalDateTime now = LocalDateTime.now();
        List<SearchSynonymGroup> groups = new ArrayList<>();
        for (String expression : tuningProperties.getSynonyms()) {
            List<String> normalizedTerms = normalizeRawTerms(List.of(expression.split(",")));
            if (normalizedTerms.size() < 2) {
                continue;
            }
            groups.add(new SearchSynonymGroup(
                    UUID.randomUUID().toString(),
                    normalizedTerms,
                    now.toString(),
                    now.toString()));
        }
        return new SearchSynonymCatalogDocument(CONFIG_DOCUMENT_TYPE, groups, now.toString());
    }

    private void persistDocument(SearchSynonymCatalogDocument document) {
        try {
            openSearchRestClient.put()
                    .uri("/{index}/_doc/{id}", settingsIndexName, settingsDocumentId)
                    .body(objectMapper.writeValueAsString(document))
                    .retrieve()
                    .toBodilessEntity();
            refreshSettingsIndex();
            cachedDocument = document;
            configReady = true;
        } catch (RestClientException exception) {
            throw new BusinessException("Unable to persist synonym configuration", exception);
        }
    }

    private void refreshSettingsIndex() {
        openSearchRestClient.post()
                .uri("/{index}/_refresh", settingsIndexName)
                .retrieve()
                .toBodilessEntity();
    }

    private boolean resourceExists(String pathTemplate, Object... uriVariables) {
        try {
            openSearchRestClient.method(HttpMethod.HEAD)
                    .uri(pathTemplate, uriVariables)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return false;
            }
            throw new BusinessException("Unable to inspect OpenSearch configuration state", exception);
        }
    }

    private String buildSettingsIndexDefinition() {
        Map<String, Object> groupProperties = new LinkedHashMap<>();
        groupProperties.put("id", Map.of("type", "keyword"));
        groupProperties.put("terms", Map.of("type", "keyword"));
        groupProperties.put("createdAt", Map.of("type", "date"));
        groupProperties.put("updatedAt", Map.of("type", "date"));

        Map<String, Object> definition = new LinkedHashMap<>();
        definition.put("settings", Map.of(
                "index", Map.of(
                        "number_of_shards", 1,
                        "number_of_replicas", 0)));
        definition.put("mappings", Map.of(
                "properties", Map.of(
                        "type", Map.of("type", "keyword"),
                        "groups", Map.of("type", "nested", "properties", groupProperties),
                        "updatedAt", Map.of("type", "date"))));
        return objectMapper.writeValueAsString(definition);
    }

    private List<String> normalizeTerms(SearchSynonymRequest request) {
        if (request == null) {
            throw new BusinessException("Synonym group payload is required");
        }
        List<String> normalizedTerms = normalizeRawTerms(request.terms());
        if (normalizedTerms.size() < 2) {
            throw new BusinessException("A synonym group requires at least two distinct terms");
        }
        if (normalizedTerms.size() > MAX_GROUP_TERMS) {
            throw new BusinessException("A synonym group can include at most " + MAX_GROUP_TERMS + " terms");
        }
        return normalizedTerms;
    }

    private List<String> normalizeRawTerms(List<String> rawTerms) {
        if (rawTerms == null || rawTerms.isEmpty()) {
            return List.of();
        }
        Set<String> uniqueTerms = new LinkedHashSet<>();
        for (String rawTerm : rawTerms) {
            String normalized = normalizePhrase(rawTerm);
            if (normalized != null) {
                uniqueTerms.add(normalized);
            }
        }
        return List.copyOf(uniqueTerms);
    }

    private void ensureNoSharedTerms(List<SearchSynonymGroup> groups,
                                     List<String> normalizedTerms,
                                     String currentGroupId) {
        Set<String> candidateTerms = Set.copyOf(normalizedTerms);
        for (SearchSynonymGroup group : groups) {
            if (Objects.equals(group.id(), currentGroupId)) {
                continue;
            }
            for (String existingTerm : group.terms()) {
                if (candidateTerms.contains(existingTerm)) {
                    throw new BusinessException("Term already belongs to another synonym group: " + existingTerm);
                }
            }
        }
    }

    private boolean queryMatchesTerm(String normalizedQuery, String normalizedTerm) {
        if (normalizedQuery.equals(normalizedTerm)) {
            return true;
        }
        if (normalizedQuery.contains(normalizedTerm)) {
            return true;
        }
        return List.of(normalizedQuery.split(" ")).contains(normalizedTerm);
    }

    private String normalizePhrase(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }

    private record SearchSynonymCatalogDocument(
            String type,
            List<SearchSynonymGroup> groups,
            String updatedAt) {
    }

    private record SearchSynonymGroup(
            String id,
            List<String> terms,
            String createdAt,
            String updatedAt) {

        private SearchSynonymResponse toResponse() {
            return new SearchSynonymResponse(id, primaryTerm(), terms, terms.size(), createdAt, updatedAt);
        }

        private String primaryTerm() {
            return terms.isEmpty() ? "" : terms.getFirst();
        }
    }
}
