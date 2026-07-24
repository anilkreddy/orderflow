package com.orderflow.customer;

import com.orderflow.customer.config.IdentityAdminProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:customerdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "IDENTITY_ADMIN_REALM=master",
        "IDENTITY_REALM=oflio"
})
class CustomerServiceApplicationTests {

    @Autowired
    private IdentityAdminProperties identityAdminProperties;

    @Test
    void contextLoads() {
        assertThat(identityAdminProperties.adminRealm()).isEqualTo("master");
        assertThat(identityAdminProperties.targetRealm()).isEqualTo("oflio");
    }
}
