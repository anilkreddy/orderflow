# 02. Request And Event Flows

This file explains the most important runtime paths in the system.

## Flow 1: Browsing products in the storefront

Path:

1. `portal-ui` calls `GET /api/search/products`
2. request reaches `api-gateway`
3. `api-gateway` routes `/api/search/**` to `search-service`
4. `search-service` queries OpenSearch
5. search results are returned to `portal-ui`

Why this matters:

- the storefront does not use PostgreSQL directly for listing/filtering/searching products
- product search is intentionally separated from product CRUD

Code to read:

- `frontend/portal-ui/src/lib/api.ts`
- `backend/api-gateway/src/main/resources/application.yml`
- `backend/search-service/src/main/java/com/orderflow/search/service/ProductSearchServiceImpl.java`

## Flow 2: Creating an order

Path:

1. customer submits checkout in `portal-ui`
2. `portal-ui` sends `POST /api/orders` to `api-gateway`
3. `api-gateway` routes to `order-service`
4. `order-service` validates the request
5. `order-service` calls `product-service` to reserve stock
6. `product-service` reduces stock in `product_db`
7. `order-service` writes the order to `order_db`
8. `order-service` publishes `order.created` to Kafka
9. `notification-service` consumes the event and sends email
10. Mailpit captures the email locally

Why this matters:

- steps 4 to 7 are synchronous because the user needs an immediate result
- steps 8 to 10 are asynchronous because notification is follow-up work

Code to read:

- `backend/order-service/src/main/java/com/orderflow/order/service/OrderServiceImpl.java`
- `backend/order-service/src/main/java/com/orderflow/order/client/ProductClient.java`
- `backend/product-service/src/main/java/com/orderflow/product/service/ProductServiceImpl.java`
- `backend/notification-service/src/main/java/com/orderflow/notification/consumer/OrderCreatedConsumer.java`

## Flow 3: Product create/update and search indexing

Path:

1. admin creates or updates a product in `admin-ui`
2. `admin-ui` sends product CRUD request to `api-gateway`
3. `api-gateway` routes to `product-service`
4. `product-service` saves the product in PostgreSQL
5. `product-service` publishes `product.upserted`
6. `search-service` consumes the event
7. `search-service` upserts the product document into OpenSearch

Why this matters:

- catalog CRUD and search indexing are decoupled
- OpenSearch stays eventually consistent with PostgreSQL

Code to read:

- `frontend/admin-ui/src/lib/api.ts`
- `backend/product-service/src/main/java/com/orderflow/product/service/ProductServiceImpl.java`
- `backend/search-service/src/main/java/com/orderflow/search/messaging/ProductIndexingConsumer.java`

## Flow 4: Notification rendering

Path:

1. Kafka event arrives in `notification-service`
2. a topic-specific consumer receives the event
3. consumer calls `NotificationOrchestratorService`
4. orchestrator chooses:
   - recipient
   - subject
   - template type
   - template variables
5. `EmailTemplateService` renders Thymeleaf HTML
6. `EmailService` either:
   - sends via SMTP if enabled
   - logs preview if disabled

Why this matters:

- business logic is outside templates
- HTML is outside Java code
- notification delivery can be enabled/disabled by config

Code to read:

- `backend/notification-service/src/main/java/com/orderflow/notification/service/NotificationOrchestratorService.java`
- `backend/notification-service/src/main/java/com/orderflow/notification/template/EmailTemplateService.java`
- `backend/notification-service/src/main/resources/templates/email/`

## Flow 5: Search operations in admin-ui

Path:

1. `admin-ui` calls `/api/search/products`, `/api/search/tuning`, `/api/search/synonyms`
2. `api-gateway` routes to `search-service`
3. `search-service` reads/writes OpenSearch
4. admin can preview search behavior or trigger reindex

Why this matters:

This shows a common enterprise pattern: backoffice tools often need operational features that customer-facing apps do not expose.

## Debugging a flow

When you want to understand any flow, use this sequence:

1. start at the frontend API call
2. find the gateway route
3. find the controller/service handling the request
4. check whether it calls another service synchronously
5. check whether it emits or consumes a Kafka event
6. inspect the persistence or side-effect layer

That approach works across most microservice systems, not just this repo.
