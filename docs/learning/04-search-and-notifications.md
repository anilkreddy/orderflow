# 04. Search And Notifications

These are the two most event-driven subsystems in OrderFlow.

## Search subsystem

### Why OpenSearch exists

A transactional database is good at:

- storing correct data
- enforcing constraints
- supporting updates

A search engine is good at:

- relevance ranking
- full-text matching
- autocomplete
- faceting and aggregations
- filter-heavy browsing

That is why `search-service` exists separately from `product-service`.

### Search data ownership

- PostgreSQL in `product-service` is the source of truth
- OpenSearch is a derived read model

That means if search becomes stale, the system can reindex from the product catalog.

### What search-service adds on top of raw search

- product search API
- suggestions/autocomplete
- category and price facets
- stock-aware filtering
- synonym management
- manual reindex endpoint

### Search consistency model

Search is eventually consistent.

That means:

- a product update is saved first in PostgreSQL
- Kafka event is emitted after that
- OpenSearch is updated shortly afterward

This is normal in distributed systems.

## Notification subsystem

### Why notifications are event-driven

The user should not wait for email rendering and delivery inside the order creation request.

That would increase latency and couple order creation to SMTP availability.

Instead:

- `order-service` publishes an event
- `notification-service` reacts asynchronously

### Current email flow design

`notification-service` is split into four concerns:

1. consumers receive Kafka messages
2. orchestrator decides what email to build
3. template service renders HTML
4. email service sends or previews

That separation is useful because each concern can change independently.

### Why Thymeleaf templates matter

Templates move HTML out of Java code.

Benefits:

- easier to maintain markup
- easier to reuse fragments
- cleaner service code
- easier future design changes

### Preview mode vs send mode

The property `notification.email.enabled` controls behavior:

- `false`: log preview only
- `true`: send via SMTP

This is a practical development pattern because it allows safe local testing even before a real mail provider exists.

### Mailpit's role

Mailpit gives you a fake SMTP server and inbox UI.

Locally, it lets you:

- send real SMTP messages without external email infrastructure
- inspect HTML output
- inspect message headers
- automate checks through its API

## Lessons this teaches about microservices

### Use async processing for side effects

Notifications and search indexing are side effects of core business actions. They are good candidates for Kafka.

### Keep domain logic out of infrastructure adapters

Consumers should stay thin.
The orchestrator should make business decisions.
The SMTP sender should only handle delivery.

### Accept eventual consistency where it makes sense

Search and notifications do not need to block order creation.

That is a deliberate architectural tradeoff.

## Current limitations worth understanding

- search-service depends on OpenSearch and Kafka being available
- notification-service supports more event types than the rest of the platform currently publishes
- there is no dead-letter topic strategy yet
- retry policies are intentionally simple for learning

These are not mistakes. They are reasonable simplifications for a learning project.
