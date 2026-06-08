package com.orderflow.customer.config;

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
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Value("${application.security.external-issuer-uri:http://localhost:8180/realms/oflio}")
    private String externalIssuerUri;

    @Value("${application.security.internal-jwk-set-uri:http://localhost:8180/realms/oflio/protocol/openid-connect/certs}")
    private String internalJwkSetUri;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/customers/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/customers/me").hasAnyAuthority("SCOPE_customer", "SCOPE_admin")
                        .requestMatchers("/api/customers/**").hasAuthority("SCOPE_admin")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(internalJwkSetUri).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(externalIssuerUri));
        return decoder;
    }

    @Bean
    Converter<Jwt, ? extends org.springframework.security.authentication.AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new ScopeAuthorityConverter());
        return converter;
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

        private final JwtGrantedAuthoritiesConverter defaultScopesConverter = new JwtGrantedAuthoritiesConverter();

        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            Set<String> authorities = new LinkedHashSet<>();
            defaultScopesConverter.convert(jwt).forEach(authority -> authorities.add(authority.getAuthority()));
            collectScopesFromRoles(jwt).forEach(scope -> authorities.add("SCOPE_" + scope));
            return authorities.stream()
                    .map(authority -> (GrantedAuthority) new SimpleGrantedAuthority(authority))
                    .toList();
        }

        private List<String> collectScopesFromRoles(Jwt jwt) {
            List<String> scopes = new ArrayList<>();
            scopes.addAll(extractRealmScopes(jwt));
            scopes.addAll(extractClientScopes(jwt));
            return scopes;
        }

        @SuppressWarnings("unchecked")
        private List<String> extractRealmScopes(Jwt jwt) {
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
        private List<String> extractClientScopes(Jwt jwt) {
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
