package com.orderflow.search.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class OpenSearchConfiguration {

    @Bean(name = "openSearchRestClient")
    public RestClient openSearchRestClient(RestClient.Builder builder,
                                           @Value("${application.search.opensearch.url}") String openSearchUrl) {
        return builder
                .baseUrl(openSearchUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
