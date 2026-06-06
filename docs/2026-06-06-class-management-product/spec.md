# Class Management Product Design

Status: Working draft. Not approved for implementation planning yet.

Date: 2026-06-06

## Goal

Design an agnostic multi-tenant class-management SaaS layer that uses one shared Supabase backend/project. This Eden website is only the first implementation playground. Other websites/products can copy the frontend/API integration logic while still working against the same Supabase backend.

The product has four connected systems:

1. Identity, roles, users, and permissions.
2. Classes, schedules, templates, and registration policy.
3. Membership definitions and user membership grants.
4. Registration behavior that uses class policy plus membership entitlement.

## Current Context

This repo is a Vite, React, TypeScript marketing site with an existing Supabase local stack. The current database only has `public.lesson_signups`, a simple lead-capture table with public insert access.

There is also a prior lesson-management design at `docs/superpowers/specs/2026-05-31-lesson-management-service-design.md`. That design is useful context, but it is too single-site and lesson-specific for this product. It models owner/admin role management, lessons, pending approvals, and booking RPCs. It does not model tenant/vendor isolation, memberships, reusable templates, entitlement consumption, or cross-site portability.

Supabase context verified for this draft:

- Local Supabase stack is running.
- `supabase/config.toml` exposes `public` and `graphql_public`.
- Local Postgres major version is 17.
- Edge Runtime is enabled with Deno 2.
- Supabase changelog has recent breaking changes around Data API exposure and GraphQL introspection, so new-table exposure and RLS/grants must be explicit.

## Roadmap Opinion

The proposed four-system roadmap is directionally right, but the order needs one extra foundation step:

0. Product-key tenant boundary.
1. Roles/users/permissions.
2. Classes.
3. Memberships.
4. Class-registration and membership interaction.

The pushback: if this is meant to be one Supabase project shared by many product/site implementations, a global `manager/user` flag is not enough. A user can be a manager in one product context and a regular user in another. Without an explicit product-key tenant boundary, permissions and memberships will leak conceptually and possibly technically.

My recommendation is to treat `product_key` tenancy as part of system 1, not a later extension.

## Product Model

### Product / Tenant

A product is the business context that owns classes, templates, membership types, membership grants, and role assignments. The user-facing term can later be "business", "studio", "school", or "project", but the backend boundary is a product key.

Initial product shape:

- `id`
- `product_key`
- display name
- active state
- created/updated audit fields

The Eden website can start with one product key, but the schema and APIs should always require product context. That keeps the implementation reusable without forcing a product-switching UI on day one.

Important design choice: use shared tables with `product_id` or `product_key` columns, not separate physical tables per product. "Manager of his own tables/data" should mean "manager scoped to his product's rows." Separate physical tables per product would multiply migrations, RLS policies, functions, and verification work.

### Users and Roles

Use Supabase Auth for identity. Store product authorization in database tables, not user-editable metadata.

Initial application roles:

- `admin`: platform owner role for you. Can operate across products through protected backend/operator flows.
- `manager`: manages the product's classes, schedules, templates, registration policy, membership types, and user membership grants.
- `user`: can view eligible classes and register according to class policy and membership state.

Recommended role model:

- `manager` and `user` assignments are scoped to `product_id` / `product_key`.
- `admin` is not product-scoped; it is a platform/operator role for the product owner.
- A user can be a manager in one product and a user in another product.
- A product must have at least one active manager.
- Profile fields should be separate from tenant membership and tenant role assignments.

There are no client-business roles beyond `manager` and `user` in v1. Last-manager protection should be enforced as an invariant on manager-management actions, not by adding an `owner` role.

Supabase `service_role` is not an application role. It is a privileged server-side key/Postgres role that can bypass RLS. It must remain outside browser code and outside ordinary product flows. The `admin` application role identifies the project owner who may trigger protected backend/operator flows; those flows may use service-level capabilities only after verifying the signed-in Supabase Auth user is the platform admin.

### Classes

A class is a scheduled offering that users can register for.

Class concepts:

- Class template: reusable definition for title, description, default duration, location, capacity, and default registration policy.
- Class occurrence: concrete scheduled instance with start/end time, capacity, status, and registration policy.
- Registration policy:
  - `auto_register`: eligible users are registered immediately if capacity remains.
  - `require_approval`: users create a pending request unless a valid membership bypasses approval.
- Membership requirement:
  - `none`: anyone in the tenant's user audience can register according to registration policy.
  - `required`: only users with valid membership entitlement can register.
  - Open question: whether some classes can allow non-members to request approval while members auto-register.

Recommended state model:

- Class status: `draft`, `published`, `cancelled`.
- Registration status: `pending`, `approved`, `rejected`, `cancelled`.
- For `auto_register`, the registration is created as `approved`.
- For `require_approval`, the registration is created as `pending`, unless membership entitlement bypasses approval.

### Memberships

A membership type is created by a manager and can be granted to users. Selling is out of scope for this design; only manual grants are included.

Membership modes:

- `infinite`: valid forever and does not consume stock.
- `limited`: valid between start date and end date and does not consume stock.
- `stock`: grants a fixed number of class entries; each membership-backed registration consumes one entry.
- `limited_stock`: grants a fixed number of entries and expires on an end date.

Recommended separation:

- Membership type defines the product: name, mode, default limits, tenant scope, active state.
- Membership grant assigns that type to a user: validity window, total stock, remaining stock, grant status, audit fields.
- Membership usage records consumption: registration id, grant id, quantity, created_at, and reversal/cancellation state.

Pushback: do not store only `remaining_stock` and call it done. You need a usage ledger so cancellation, admin correction, audits, and race-condition debugging are possible.

### Registration + Membership Interaction

Registration should be one atomic backend operation. The frontend should ask to register; the backend decides pending vs approved, capacity, membership eligibility, and stock consumption.

Recommended behavior:

1. User requests registration for a class occurrence.
2. Backend loads the class, tenant, registration policy, and membership requirement.
3. Backend checks whether the user is allowed in that tenant context.
4. Backend finds the best valid membership grant if membership is required or can bypass approval.
5. Backend locks the class/capacity and relevant membership grant before writing.
6. Backend creates registration:
   - approved immediately for `auto_register`.
   - pending for `require_approval`.
   - approved immediately for `require_approval` only when valid membership grants bypass approval.
7. Backend writes membership usage only when membership stock is consumed.

Cancellation must define whether stock is restored. The recommended default is:

- User cancellation before class start restores stock if the registration consumed stock.
- Manager cancellation of a class restores stock for all affected membership-backed registrations.
- Cancellation after class start does not restore stock unless a manager or platform admin performs an explicit correction.

## Technical Design Direction

The reusable backend should be Edge-Function-first with explicit database safety boundaries:

- Frontend projects do not call database tables or Postgres RPCs directly.
- Edge Functions are the canonical public product API for all frontend implementations.
- Edge Functions validate product key, allowed origin, JWT, app role, and request shape before touching the database.
- Tables still enforce product boundaries, RLS, and relational integrity as defense in depth.
- Postgres functions should handle atomic entitlement decisions because class capacity and membership stock must be updated transactionally.

Supabase RLS remains the last line of defense. Every table in `public` should enable RLS, and grants must be explicit because new-table Data API exposure behavior has changed.

Canonical API decision: use Edge Functions wrapping narrowly scoped Postgres RPCs. Edge Functions provide the reusable HTTP API surface and product-origin binding. Postgres RPCs own transactional business decisions.

Product binding should use two layers:

- `product_key` is a public scope identifier used by frontend projects to select their product context.
- Product domains/origins are registered server-side and checked by Edge Functions, including localhost origins during development.

This means `product_key` is not treated as a secret. Authorization still comes from user role/membership checks inside that product. Edge Functions should verify that the request origin is allowed for the submitted product key before any database operation.

## Permissions / Security

Security principles:

- Never trust frontend role checks.
- Never use user-editable metadata for authorization.
- Never expose direct table/RPC access as the application API.
- Every product-scoped row includes `product_id` or a validated `product_key` relationship.
- Every RLS policy checks product membership or role assignment.
- Manager writes require product-scoped manager role.
- Platform admin operations require the signed-in user to match the protected admin allowlist before using service-role capabilities.
- Every API call must verify that the request origin is allowed for the supplied product key.
- Registration and membership consumption happen atomically server-side.
- Service-role keys stay only in Edge Function/server context, never in browser code.
- `security definer` functions should use a fixed `search_path` and stay narrowly scoped.

Important Supabase-specific notes:

- RLS must be enabled for every table in exposed schemas.
- New SQL-created tables may require explicit Data API exposure/grants.
- Edge Functions receive user auth headers; if using a Supabase client inside a function, pass through the user's JWT when enforcing user-context RLS.
- Edge Functions require JWT verification by default unless configured otherwise.

## Data / State Draft

Candidate tables:

- `products`
- `product_allowed_origins`
- `product_members`
- `product_roles`
- `platform_admins` or equivalent server-side configuration for project-owner maintenance access, if needed
- `profiles`
- `class_templates`
- `class_occurrences`
- `class_registrations`
- `membership_types`
- `membership_grants`
- `membership_usage`

Candidate registration RPC/API operations:

- create/update class template
- create/update/cancel/publish class occurrence
- create/update/deactivate membership type
- grant/revoke membership to user
- register for class
- cancel registration
- approve/reject registration
- list public class availability
- list manager schedule and pending requests
- list user memberships and usage

## Edge Cases

- User is manager in one product and user in another.
- User has multiple valid memberships; backend must choose deterministic consumption order.
- Membership expires between viewing a class and registering.
- Last remaining class seat and last remaining membership stock are claimed concurrently.
- User cancels a membership-backed class before start.
- Manager cancels a class after registrations consumed stock.
- User requests a require-approval class without membership.
- Class requires membership but user has only expired or depleted membership.
- Manager changes a class from no-membership to membership-required after users registered.
- Manager reduces class capacity below already-approved registrations.

## Planning Boundary Guidance

Future implementation should be chunked, not built as one monolith:

1. Product and role foundation: product tables, product-scoped role checks, profile and first-manager bootstrap.
2. Class system: templates, occurrences, registration policies, manager schedule management.
3. Membership system: types, grants, ledger, manager grant management.
4. Registration engine: atomic registration, approval, capacity, membership bypass, stock consumption and restoration.
5. Frontend product shell: admin/user views against the reusable API.
6. Local Supabase verification: SQL/RLS regression checks and Edge Function smoke tests.

## Acceptance Criteria

- The design supports one Eden product key today while sharing one Supabase project across future products/sites.
- Manager permissions are scoped per product key.
- Platform admin permissions are restricted to the project owner through protected backend/operator flows.
- Users can register for classes according to class policy.
- Managers can create templates, schedule classes, and choose approval behavior.
- Managers can create membership types and grant memberships to users.
- Membership modes support infinite, limited, stock, and limited stock.
- Membership-backed registration can bypass approval when the class policy allows it.
- Membership stock consumption is atomic and auditable.
- RLS prevents cross-product data access.
- API boundaries are reusable by future websites, not coupled to Eden-specific UI.
- Product key spoofing is not enough to mutate another product because mutating APIs check both origin binding and product-scoped user authorization.

## Assumptions

- Payments and selling memberships are out of scope.
- Attendance, reminders, waitlists, and recurring-series generation are out of scope for the first implementation.
- The local Supabase stack is the development backend.
- Edge Functions are the only application API exposed to frontend projects; Postgres/RPC should own transactional class and membership decisions behind that API.
- The public website may remain Eden-specific while the backend and core product UI stay product-key-aware.

## Open Questions

Open questions are tracked in `agenda.md`. The highest-risk initial question is whether the product is truly multi-tenant from day one at the data/API layer, even if the Eden UI only exposes one tenant.
