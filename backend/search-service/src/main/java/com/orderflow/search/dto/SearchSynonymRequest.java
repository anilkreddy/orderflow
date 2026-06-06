package com.orderflow.search.dto;

import java.util.List;

public record SearchSynonymRequest(List<String> terms) {
}
