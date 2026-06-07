# 03. Backend Services

## Backend build layout

The backend is a Gradle multi-module build.

Important files:

- `backend/settings.gradle`
- `backend/build.gradle`

What that gives you:

- shared Java 21 toolchain
- consistent dependency management
- per-service Spring Boot modules

## API Gateway

Location:

- `backend/api-gateway`

Role:

- route frontend traffic to backend services
- centralize CORS policy
- hide internal service URLs from the browser

Important file:

- `backend/api-gateway/src/main/resources/application.yml`

Key learning point:

The gateway does not own business logic. It is an edge service.

## Product Service

Location:

- `backend/product-service`

Role:

- manage categories and products
- own stock quantities
- reserve stock for orders
- publish product search indexing events

Important concepts used:

- Spring Web MVC controllers
- JPA entities and repositories
- validation
- MapStruct mappers
- transaction boundaries

Important code:

- `service/ProductServiceImpl.java`
- `controller/ProductController.java`
- `controller/CategoryController.java`
- `mapper/ProductMapper.java`
- `repository/ProductRepository.java`

Key learning point:

This service is the source of truth for catalog data, not the search service.

## Order Service

Location:

- `backend/order-service`

Role:

- validate order requests
- call `product-service` synchronously for stock reservation
- persist orders and order items
- publish order events

Important code:

- `service/OrderServiceImpl.java`
- `client/ProductClient.java`
- `messaging/OrderEventPublisher.java`
- `domain/Order.java`
- `domain/OrderItem.java`

Key learning point:

This service shows a common microservice pattern:

- use HTTP for immediate consistency requirements
- use Kafka for downstream reactions

## Notification Service

Location:

- `backend/notification-service`

Role:

- consume Kafka events
- orchestrate email notifications
- render Thymeleaf HTML templates
- send through SMTP or log previews

Important code:

- `consumer/`
- `event/`
- `service/NotificationOrchestratorService.java`
- `service/EmailService.java`
- `template/EmailTemplateService.java`
- `templates/email/`

Current event support:

- `order.created`
- `order.cancelled`
- `inventory.low-stock`

Important note:

At the moment, `order.created` is published by a live service flow.
The other two are implemented in notification-service and are ready for real publishers.

## Search Service

Location:

- `backend/search-service`

Role:

- expose product search APIs
- manage relevance tuning and synonyms
- keep OpenSearch in sync with catalog changes
- provide a search-optimized read model

Important code:

- `service/ProductSearchServiceImpl.java`
- `messaging/ProductIndexingConsumer.java`
- `client/ProductCatalogClient.java`
- `config/SearchTuningProperties.java`

Key learning point:

Search is treated as its own subsystem because it has different technical needs from CRUD.

## Common Spring patterns you will see

### Constructor injection

Used across services to keep dependencies explicit and testable.

### Layered architecture

Common layers include:

- controller
- service
- mapper
- repository
- config
- messaging or client

### DTOs

External API payloads are separated from entities.

That helps avoid leaking persistence details into API contracts.

### Global exception handling

Services return structured errors instead of raw stack traces.

## How to read a service effectively

For each service, read in this order:

1. `application.yml`
2. controller package
3. service package
4. domain and repository packages
5. messaging/client packages
6. tests

That order helps you understand the service from the outside in.
