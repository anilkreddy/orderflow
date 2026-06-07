# 07. How To Study And Extend OrderFlow

## Best way to study this repo

Do not try to understand everything at once.

Use one business flow at a time.

Recommended sequence:

1. product listing and search
2. checkout and order creation
3. notification delivery
4. product updates and search reindexing
5. admin search operations

## Practical study exercise

### Exercise 1: trace product search

Follow:

- `portal-ui` search page
- frontend API client
- gateway route
- `search-service` controller and service
- OpenSearch query builder logic

Goal:

Understand why search is not just `SELECT * FROM products`.

### Exercise 2: trace order creation

Follow:

- checkout page
- `POST /api/orders`
- `OrderServiceImpl`
- `ProductClient`
- stock reservation in `product-service`
- order persistence
- `order.created` publishing

Goal:

Understand the mix of synchronous and asynchronous work.

### Exercise 3: trace notification rendering

Follow:

- Kafka consumer
- orchestrator service
- template service
- email template files
- Mailpit inbox

Goal:

Understand how infrastructure, templates, and business orchestration are separated.

## How to add a new backend feature safely

Use this checklist:

1. decide which service owns the feature
2. decide whether the feature needs:
   - synchronous HTTP
   - asynchronous eventing
   - both
3. define DTOs and validation
4. implement service logic
5. add logging and error handling
6. add tests
7. update README and docs if the architecture changed

## Examples of good next features

### Customer service

Why:

- customer data is currently inferred from orders
- a dedicated service would make the domain cleaner

### Real authentication and authorization

Why:

- admin auth is frontend-only today
- Keycloak would move identity to the right boundary

### Inventory events from product-service

Why:

- low-stock notifications are implemented in notification-service
- but the publishing side should be added to catalog or inventory logic

### Order cancellation flow in order-service

Why:

- order-cancelled notification support exists
- the actual business operation should publish that event

## Microservice judgment rules to learn here

### Do not split services just because you can

A new service is justified when it owns a distinct business area or scaling/deployment concern.

### Keep ownership clear

If two services both feel like the source of truth for the same concept, the design is probably drifting.

### Prefer explicit integration boundaries

Use APIs and events deliberately. Avoid hidden coupling through direct database access across services.

## Final advice for learning

When reading enterprise systems, always ask:

- who owns this data?
- who starts this flow?
- who reacts later?
- what happens if a dependency is down?
- where is consistency immediate vs eventual?

If you can answer those five questions for each feature, you are understanding the system correctly.
