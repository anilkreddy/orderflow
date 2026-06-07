# 01. System Overview

## What OrderFlow is

`OrderFlow` is a small commerce platform with:

- a customer storefront: `frontend/portal-ui`
- an internal backoffice: `frontend/admin-ui`
- an API gateway: `backend/api-gateway`
- business services:
  - `product-service`
  - `order-service`
  - `notification-service`
  - `search-service`
- supporting infrastructure:
  - PostgreSQL
  - Kafka
  - OpenSearch
  - Mailpit

## Why it uses microservices

The codebase is split by business responsibility, not by technical layer.

Each service owns a focused problem:

- `product-service`: catalog and stock
- `order-service`: order creation and persistence
- `notification-service`: email notifications from events
- `search-service`: product discovery and relevance/search operations
- `api-gateway`: one entry point for frontend traffic

This is the core microservices idea: separate services by bounded context so each service has a clear responsibility and can evolve independently.

## Architecture at a glance

```text
portal-ui/admin-ui
        |
        v
   api-gateway
    /   |    \
   v    v     v
product order search
   |      \     |
   v       v    v
product-db Kafka OpenSearch
            |
            v
     notification-service
            |
            v
          Mailpit
```

## What is synchronous vs asynchronous here

### Synchronous

Use synchronous HTTP when one service needs an immediate answer to finish the request.

Example:

- `order-service` calls `product-service` to reserve stock before the order is saved

If stock cannot be reserved, the order request should fail immediately. That makes HTTP the right tool.

### Asynchronous

Use Kafka when work can happen after the main transaction is finished.

Examples:

- after an order is created, `order-service` publishes `order.created`
- `notification-service` consumes that event and sends an email later
- `search-service` consumes product indexing events and updates OpenSearch later

This creates looser coupling between services.

## Key design principles used in OrderFlow

### Database per service

- `product-service` owns `product_db`
- `order-service` owns `order_db`

This prevents one service from directly owning another service's data model.

### API gateway as the frontend entry point

Both React applications call `api-gateway`, not each backend service directly. That gives you:

- one public backend URL
- centralized routing
- a future place for authentication, rate limiting, and cross-cutting policies

### Event-driven integration

Kafka is used where business actions need follow-up processing without blocking the user request.

### Purpose-specific read model

OpenSearch exists because search and filtering are different problems from transactional CRUD.

PostgreSQL is the source of truth.
OpenSearch is the search-optimized read model.

## What to read next

Read [`02-request-and-event-flows.md`](./02-request-and-event-flows.md) to understand how a request or event actually moves through the application.
