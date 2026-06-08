package com.orderflow.gateway.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfiguration {

    @Value("${application.security.external-issuer-uri:http://localhost:8180/realms/oflio}")
    private String externalIssuerUri;

    @Value("${application.security.internal-jwk-set-uri:http://localhost:8180/realms/oflio/protocol/openid-connect/certs}")
    private String internalJwkSetUri;

    @Bean
    SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchange -> exchange
                        .pathMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health", "/actuator/info").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/search/products", "/api/search/suggestions").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/orders").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/orders/lookup", "/api/orders/lookup/**").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/customers/register").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/customers/me").hasAnyAuthority("SCOPE_customer", "SCOPE_admin")
                        .pathMatchers(HttpMethod.GET, "/api/orders/me").hasAnyAuthority("SCOPE_customer", "SCOPE_admin")
                        .pathMatchers(HttpMethod.GET, "/api/orders/code/*").hasAnyAuthority("SCOPE_customer", "SCOPE_admin")
                        .pathMatchers(HttpMethod.GET, "/api/orders").hasAuthority("SCOPE_admin")
                        .pathMatchers(HttpMethod.GET, "/api/orders/*").hasAuthority("SCOPE_admin")
                        .pathMatchers(HttpMethod.POST, "/api/products/**").hasAuthority("SCOPE_admin")
                        .pathMatchers(HttpMethod.PUT, "/api/products/**").hasAuthority("SCOPE_admin")
                        .pathMatchers(HttpMethod.DELETE, "/api/products/**").hasAuthority("SCOPE_admin")
                        .pathMatchers("/api/search/reindex/**", "/api/search/synonyms/**", "/api/search/tuning/**").hasAuthority("SCOPE_admin")
                        .pathMatchers("/api/customers/**").hasAuthority("SCOPE_admin")
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .build();
    }

    @Bean
    Converter<Jwt, Mono<org.springframework.security.authentication.AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        JwtAuthenticationConverter delegate = new JwtAuthenticationConverter();
        delegate.setJwtGrantedAuthoritiesConverter(new ScopeAuthorityConverter());
        return new ReactiveJwtAuthenticationConverterAdapter(delegate);
    }

    @Bean
    ReactiveJwtDecoder reactiveJwtDecoder() {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withJwkSetUri(internalJwkSetUri).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(externalIssuerUri));
        return decoder;
    }

    static class ScopeAuthorityConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

        private static final Map<String, String> ROLE_TO_SCOPE = Map.of(
                "CUSTOMER", "customer",
                "storefront-access", "customer",
                "BACKOFFICE_ADMIN", "admin",
                "admin-ui-access", "admin",
                "catalog-manager", "catalog_manager",
                "order-manager", "order_manager",
                "customer-manager", "customer_manager",
                "search-manager", "search_manager");

        private final JwtGrantedAuthoritiesConverter scopesConverter = new JwtGrantedAuthoritiesConverter();

        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            Set<String> authorities = new LinkedHashSet<>();
            scopesConverter.convert(jwt).forEach(authority -> authorities.add(authority.getAuthority()));
            collectScopesFromRoles(jwt).forEach(scope -> authorities.add("SCOPE_" + scope));
            return authorities.stream()
                    .map(authority -> (GrantedAuthority) new SimpleGrantedAuthority(authority))
                    .toList();
        }

        private List<String> collectScopesFromRoles(Jwt jwt) {
            List<String> scopes = new ArrayList<>();
            scopes.addAll(realmScopes(jwt));
            scopes.addAll(clientScopes(jwt));
            return scopes;
        }

        @SuppressWarnings("unchecked")
        private List<String> realmScopes(Jwt jwt) {
            Object claim = jwt.getClaims().get("realm_access");
            if (!(claim instanceof Map<?, ?> realmAccess)) {
                return List.of();
            }
            Object roles = realmAccess.get("roles");
            if (!(roles instanceof Collection<?> values)) {
                return List.of();
            }
            return values.stream()
                    .map(Object::toString)
                    .map(ROLE_TO_SCOPE::get)
                    .filter(scope -> scope != null && !scope.isBlank())
                    .toList();
        }

        @SuppressWarnings("unchecked")
        private List<String> clientScopes(Jwt jwt) {
            Object claim = jwt.getClaims().get("resource_access");
            if (!(claim instanceof Map<?, ?> resourceAccess)) {
                return List.of();
            }

            List<String> scopes = new ArrayList<>();
            for (Object clientValue : resourceAccess.values()) {
                if (!(clientValue instanceof Map<?, ?> clientMap)) {
                    continue;
                }
                Object roles = clientMap.get("roles");
                if (!(roles instanceof Collection<?> values)) {
                    continue;
                }
                values.stream()
                        .map(Object::toString)
                        .map(ROLE_TO_SCOPE::get)
                        .filter(scope -> scope != null && !scope.isBlank())
                        .forEach(scopes::add);
            }
            return scopes;
        }
    }
}
