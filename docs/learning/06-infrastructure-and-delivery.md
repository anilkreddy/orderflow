# 06. Infrastructure And Delivery

## Docker Compose

`docker-compose.yml` is the local platform assembly file.

It defines:

- PostgreSQL databases
- Kafka broker
- OpenSearch
- Mailpit
- all backend services
- both frontend containers

This is valuable for learning because it makes service dependencies explicit.

## What each infra component teaches

### PostgreSQL

Teaches transactional persistence and service-owned databases.

### Kafka

Teaches event-driven communication and decoupled downstream processing.

### OpenSearch

Teaches the difference between operational data and search-optimized read models.

### Mailpit

Teaches how to test email flows locally without external mail infrastructure.

## Important operational idea: environment variables

Most services are configured through environment variables in Compose.

Examples:

- database URLs and credentials
- Kafka bootstrap servers
- OpenSearch URL
- notification email toggles

This mirrors how services are configured in real deployments.

## GitHub Actions pipeline

The CI workflow is in `.github/workflows/build.yml`.

Current pipeline behavior:

- check out the repo
- set up Java 25
- build backend modules with Gradle
- run backend tests
- build backend jars
- set up Node.js 24 LTS
- install and build both frontends

Why this matters:

CI confirms that the whole repo still compiles after changes across services and frontends.

## Build model

Backend:

- Gradle multi-module
- shared plugin/dependency config in `backend/build.gradle`
- services built as Spring Boot applications

Frontend:

- each app has its own Node dependency tree and build output

Containers:

- backend services use Dockerfiles under each module
- frontend apps build and serve their static bundles from containers

## How to debug the system locally

Use this order:

1. `docker compose ps`
2. check the relevant service log with `docker compose logs -f <service>`
3. hit service status or Swagger endpoints
4. inspect Mailpit or OpenSearch if the issue is in those areas

Examples:

- email issue: inspect `notification-service` logs and `http://localhost:8025`
- search issue: inspect `search-service` logs and `http://localhost:8084/swagger-ui.html`
- order issue: inspect `order-service` and `product-service` together

## One important distributed-systems lesson

When a feature crosses multiple services, always separate these questions:

- did the HTTP request succeed?
- did the database write succeed?
- was the event published?
- was the event consumed?
- did the downstream side effect happen?

That discipline is essential in microservice debugging.
