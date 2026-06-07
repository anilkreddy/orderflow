# 05. Frontend Apps

OrderFlow has two separate React applications.

## Why two apps exist

The split is intentional.

### portal-ui

Audience:

- shoppers
- guests
- customers

Responsibilities:

- browse products
- search and filter catalog items
- add to cart
- create orders
- view order details and tracking pages

### admin-ui

Audience:

- operators
- merchandisers
- internal admins

Responsibilities:

- manage products
- review orders and customers
- inspect search behavior
- maintain synonyms and reindex search
- use internal backoffice tools

This split reflects a real commerce architecture: customer UX and backoffice UX usually diverge quickly.

## Shared frontend patterns

Both apps use:

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router

Both apps call the backend through `api-gateway`.

Important code:

- `frontend/portal-ui/src/lib/api.ts`
- `frontend/admin-ui/src/lib/api.ts`

## Why Axios clients matter

The frontend API layers centralize backend communication.

That gives you one place to:

- define endpoints
- shape request params
- handle errors consistently

This is the frontend equivalent of creating thin clients around backend APIs.

## Portal UI mental model

The portal behaves like a B2C storefront.

Key pages generally answer these questions:

- what can I buy?
- what fits my search?
- what is this product?
- what is in my cart?
- did my order go through?

The portal leans on `search-service` for discovery-heavy screens.

## Admin UI mental model

The admin UI behaves like a backoffice console.

Key pages generally answer these questions:

- what products are active?
- what orders were placed?
- what customers appear in order history?
- how is search behaving?
- what operational actions are available?

The admin app is not just a copy of the storefront with more buttons. It is a different tool for a different user.

## Current auth reality

The admin experience is currently gated in the frontend only.

That means:

- it is useful for learning UI flow separation
- it is not a real production-grade authorization model yet

A future backend auth solution such as Keycloak should move this from client-side gating to server-enforced identity and access control.

## How to learn the frontends

Read each app in this order:

1. `src/App.tsx`
2. `src/components/AppLayout.tsx` or `AdminLayout.tsx`
3. `src/lib/api.ts`
4. `src/pages/`
5. shared state/hooks/components used by those pages

This shows routing first, then page composition, then API usage.
