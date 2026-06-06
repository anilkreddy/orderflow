package com.orderflow.search;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "application.search.reindex-on-startup=false")
class SearchServiceApplicationTests {

    @Test
    void contextLoads() {
    }
}
