# OrderFlow Learning Guide

This section is written to help you learn both:

- how this specific `OrderFlow` codebase works
- how a microservices-based commerce system is typically structured

## Recommended reading order

1. [`01-system-overview.md`](./01-system-overview.md)
2. [`02-request-and-event-flows.md`](./02-request-and-event-flows.md)
3. [`03-backend-services.md`](./03-backend-services.md)
4. [`04-search-and-notifications.md`](./04-search-and-notifications.md)
5. [`05-frontend-apps.md`](./05-frontend-apps.md)
6. [`06-infrastructure-and-delivery.md`](./06-infrastructure-and-delivery.md)
7. [`07-how-to-study-and-extend-orderflow.md`](./07-how-to-study-and-extend-orderflow.md)

## What you should understand after reading

- why the system is split into multiple services
- when the application uses synchronous HTTP vs asynchronous Kafka events
- how data moves through PostgreSQL, OpenSearch, and Mailpit
- how the two React frontends talk to the backend
- how to trace a request or event through the codebase
- where to add the next feature safely

## Current reality of the project

This is a production-shaped learning system, not a finished enterprise platform.

That means:

- several important patterns are already present: API gateway, service boundaries, Kafka, search indexing, HTML notifications, Docker Compose, CI
- some enterprise concerns are intentionally simplified: admin auth is still frontend-gated, customer management is not yet a dedicated service, and some events are demonstrated before all live publishers exist

That is a good learning setup because the architecture is visible without being buried under too much complexity.
