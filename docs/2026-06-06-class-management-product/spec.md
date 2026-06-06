# Class Management Product Design

Status: Final design pending user approval for implementation planning.

Date: 2026-06-06

## Goal

Design an agnostic multi-tenant class-management SaaS layer that uses one shared Supabase backend/project. This Eden website is only the first implementation playground. Other websites/products can copy the frontend/API integration logic while still working against the same Supabase backend.

The product has four connected systems:

1. Identity, roles, users, and permissions.
2. Classes, schedules, templates, and registration policy.
3. Membership definitions and user membership grants.
4. Registration behavior that uses class policy plus membership entitlement.

## Current Context

This repo is a Vite, React, TypeScript marketing site with an existing Supabase local stack. The existing app is only an implementation playground for the new class-management product; the reusable product design should not rely on deleted or legacy lesson-management documentation.

The current database baseline is intentionally small and site-specific. The class-management product should introduce its own product-scoped schema, Edge Function API boundary, and verification path rather than extending legacy lesson-signup assumptions.

Supabase context verified for this draft:

- Local Supabase stack is running.
- `supabase/config.toml` exposes `public` and `graphql_public`.
- Local Postgres major version is 17.
- Edge Runtime is enabled with Deno 2.
- Supabase changelog has recent breaking changes around Data API exposure and GraphQL introspection, so new-table exposure and RLS/grants must be explicit.

## Roadmap Opinion

The proposed four-system roadmap is directionally right, but the order needs one extra foundation step:

0. Product-key product boundary.
1. Roles/users/permissions.
2. Classes.
3. Memberships.
4. Class-registration and membership interaction.

The pushback: if this is meant to be one Supabase project shared by many product/site implementations, a global `manager/user` flag is not enough. A user can be a manager in one product context and a regular user in another. Without an explicit product-key boundary, permissions and memberships will leak conceptually and possibly technically.

My recommendation is to treat `product_key` tenancy as part of system 1, not a later extension.

## Product Model

### Product

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

- `admin`: platform owner role for you. Can view users/data across products through protected backend/operator flows and assign product managers, but does not perform day-to-day product management actions.
- `manager`: manages the product's classes, schedules, templates, registration policy, membership types, and user membership grants.
- `user`: can view eligible classes and register according to class policy and membership state.

Recommended role model:

- `manager` and `user` assignments are scoped to `product_id` / `product_key`.
- `admin` is not product-scoped as an authority level; it is a platform/operator role for the product owner. Admin UI should still be filtered by domain/product context when operating inside a specific frontend implementation.
- A user can be a manager in one product and a user in another product.
- A product must have at least one active manager.
- Profile fields should be separate from product access and product role assignments.

There are no client-business roles beyond `manager` and `user` in v1. Last-manager protection should be enforced as an invariant on manager-management actions, not by adding an `owner` role.

Supabase `service_role` is not an application role. It is a privileged server-side key/Postgres role that can bypass RLS. It must remain outside browser code and outside ordinary product flows. The `admin` application role identifies the project owner who may trigger protected backend/operator flows; those flows may use service-level capabilities only after verifying the signed-in Supabase Auth user is the platform admin.

Responsibility split:

- `admin` can create products, register allowed domains/origins, view users in product context, and assign/promote product managers.
- `admin` cannot create classes, class templates, memberships, or grants as ordinary product actions.
- `manager` can manage classes, templates, schedules, memberships, grants, and promote other users to manager within the same product.
- `user` cannot access operational class, membership, or user-management actions.
- Signing in through a product website associates the user with that product key based on the request domain/origin.
- A single Supabase Auth user can belong to multiple products. Product access is represented by separate `product_users` rows, one per `(product_id, user_id)`.

### Classes, Templates, and Schedules

A class is a scheduled offering that users can register for.

The class system has three layers:

- Class template: a manager-defined interface/schema for creating classes. It is not date-bound, not registerable, and does not represent a class instance. It defines which structured fields a product's classes may carry.
- Schedule: a time-management tool that places class templates onto repeating or planned dates. It is not itself the final attendance/registration object.
- Class: a concrete date-bound object with capacity, location, attendance/registration list, registration policy, and product-specific properties. Users register for classes, not templates or schedules.

Global class properties should include the fields the product engine needs to function consistently across products:

- name/title
- description
- category
- date/start/end time
- capacity
- location
- publication status
- lifecycle status
- visibility
- registration policy
- membership requirement
- notes
- attendance state
- trial attendance state

Product-specific class properties should live in a key-value or structured custom-data field defined by the class template, so managers can add unique fields for their product without changing the global schema.

`level` and `instructor` are product-specific template fields, not global engine fields.

Class templates support simple typed custom fields:

- text
- long text
- number
- boolean
- select
- multi-select
- date
- URL

Each template field should define a stable key, label, type, required flag, optional default value, and optional visibility/search flags. Templates should not support nested object schemas, arrays, validation expressions, or conditional logic in v1.

Detailed schedule generation behavior is owned by `docs/2026-06-06-schedule-system/spec.md`, not this root product spec. This global product spec only requires Schedule to remain distinct from Class Template and Class, and to produce concrete date-bound classes through the approved schedule-system lifecycle.

Attendance is not just a scalar class field. It should be modeled as class participation records in one `class_participants` model:

- Registered attendance: product users who registered for the class and may be pending, approved, rejected, cancelled, attended, or no-show depending on later lifecycle decisions.
- Walk-ins: existing product users who did not register in advance but attended the class.
- Trials: people who attended but are not product users yet.

Trials must be distinct from product-user attendance because they may not have a Supabase Auth identity or product access row yet.

`class_participants` should distinguish participant kind/status:

- Registered user: references a `product_users` row and has registration lifecycle state.
- Walk-in user: references a `product_users` row but has no prior class registration.
- Trial: stores trial contact/name fields and can later be converted or linked to a product user.

Constraints should prevent impossible states, such as a trial participant requiring a `user_id` or a registered/walk-in user missing a product user reference.

Registration and attendance are separate lifecycle axes:

- Registration status: `pending`, `approved`, `rejected`, `cancelled`.
- Attendance status: `present`, `absent`.

Managers start a class through a transactional backend operation. During the class-start/attendance flow, the manager can mark registered users present or absent, add walk-ins who are product users but were not registered for the class, and add trial attendees who are not product users. Trial attendees are present by default.

Starting a class is a manual manager action that changes `lifecycle_status` to `in_progress`. Finalizing a class is a manual manager action that changes `lifecycle_status` to `completed`. Registration is not allowed once a class is in progress, cancelled, completed, or past `starts_at`.

V2 should add an explicit per-class `registration_closes_at` field for custom registration deadlines.

Initial class concepts:
- Registration policy:
  - `auto_approve`: eligible users are approved immediately if capacity remains.
  - `member_auto_approve`: non-members create pending registrations and members are approved immediately when capacity and membership rules allow it.
  - `approval_required`: every registration request is pending, including members.
- Membership requirement:
  - `none`: anyone in the product's user audience can register according to registration policy.
  - `required`: only users with valid membership entitlement can register.
  - A member is a product user with an active membership grant: infinite, limited/timed, stock, or limited/timed stock.

Recommended state model:

- Class publication status, lifecycle status, and visibility should be separate:
  - `status`: `draft`, `published`
  - `lifecycle_status`: `created`, `cancelled`, `in_progress`, `completed`
  - `visibility`: `public`, `hidden`, `members_only`
- Registration status: `pending`, `approved`, `rejected`, `cancelled`.
- For `auto_approve`, the registration is created as `approved`.
- For `member_auto_approve`, non-members create pending registrations and members are approved immediately when capacity and membership rules allow it.
- For `approval_required`, all users who are eligible to register create pending registrations, including members.
- The default registration policy for new templates/classes is `member_auto_approve`.

Access and registration rules:

- `visibility` controls whether the class appears as a registrable item to non-members.
- `membership_requirement` controls whether a membership is required to attempt registration.
- `registration_policy` controls whether an eligible user is approved immediately or needs manager approval.
- Membership-backed registration consumes stock when the selected membership type is stock-based.

### Memberships

A membership type is created by a manager and can be granted to users. Selling is out of scope for this design; only manual grants are included.

Membership modes:

- `infinite`: valid forever and does not consume stock.
- `limited`: valid between start date and end date and does not consume stock.
- `stock`: grants a fixed number of class entries; each membership-backed registration consumes one entry.
- `limited_stock`: grants a fixed number of entries and expires on an end date.

Membership hierarchy from lowest to highest:

1. `stock`
2. `limited_stock`
3. `limited`
4. `infinite`

For v1, a product user can have only one active membership grant per product at a time. Managers can upgrade the user's membership to a higher mode; upgrade behavior must replace or close the previous active grant so registration never needs to choose between multiple active memberships.

V1 upgrade behavior is intentionally simple: upgrading immediately closes/replaces the previous active membership grant and starts the new grant. Preserving unused stock, carrying value, credits, refunds, or scheduled upgrades are manager/business responsibilities outside this product version.

Recommended separation:

- Membership type defines the product: name, mode, default limits, product scope, active state.
- Membership grant assigns that type to a user: validity window, total stock, remaining stock, grant status, audit fields.
- Membership usage records consumption: registration id, grant id, quantity, created_at, and reversal/cancellation state.
- Membership ledger records every membership-backed action, including class registration, registration cancellation, stock consumption/restoration, manager adjustment, and membership type changes.

Pushback: do not store only `remaining_stock` and call it done. You need a ledger so cancellation, manager correction, membership changes, audits, and race-condition debugging are possible across every membership type. Stock-affecting events carry quantity deltas; non-stock events carry audit context without changing stock.

### Registration + Membership Interaction

Registration should be one atomic backend operation. The frontend should ask to register; the backend decides pending vs approved, capacity, membership eligibility, and stock consumption.

Recommended behavior:

1. User requests registration for a class occurrence.
2. Backend loads the class, product, registration policy, and membership requirement.
3. Backend checks whether the user is allowed in that product context.
4. Backend finds the user's single active membership grant when membership is required or when membership can affect approval/stock behavior.
5. Backend locks the class/capacity and relevant membership grant before writing.
6. Backend creates registration:
   - approved immediately for `auto_approve`.
   - pending for non-members and approved for members under `member_auto_approve`.
   - pending for everyone under `approval_required`.
7. Backend writes membership usage only when membership stock is consumed.

Cancellation must define whether stock is restored. The recommended default is:

- User cancellation before class start restores stock if the registration consumed stock.
- Manager cancellation of a class restores stock for all affected membership-backed registrations.
- Cancellation after class start does not restore stock unless a manager or platform admin performs an explicit correction.
- Stock restoration must be recorded in the membership usage ledger, not only by incrementing a remaining-stock counter.

## Technical Design Direction

The reusable backend should be Edge-Function-first with explicit database safety boundaries:

- Frontend projects do not call database tables or Postgres RPCs directly.
- Edge Functions are the canonical public product API for all frontend implementations.
- Edge Functions validate product key, allowed origin, JWT, app role, and request shape before touching the database.
- Auth/signup flows resolve product context from the calling domain/origin and attach or expose the user within that product context.
- On first successful login/signup from an allowed product domain, the backend creates the user's product access row for that product if it does not already exist.
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
- Platform admin role-management actions are limited to product/user visibility and manager assignment, not product content management.
- Manager role-management actions are limited to assigning managers within the same product.
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
- `product_users`
- `platform_admins` or equivalent server-side configuration for project-owner maintenance access, if needed
- `profiles`
- `class_templates`
- `class_occurrences`
- `class_registrations`
- `membership_types`
- `membership_grants`
- `membership_usage`

Candidate registration RPC/API operations:

- create product and allowed origins
- resolve product context from origin/domain
- associate signed-in user with product context
- promote user to manager
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
- Supabase Auth user already exists from another product, but no product access row exists for the current domain yet.
- User upgrade attempts could leave multiple active memberships unless the backend enforces one active grant per product user.
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

1. Product and role foundation: product tables, domain/origin binding, product-scoped role checks, profile and first-manager bootstrap.
2. Class template system: product-scoped class interface/schema definitions and custom fields.
3. Class schedule system: repeating/planned placement of templates onto dates.
4. Concrete class system: date-bound registerable class objects, attendance/registration lists, capacity, policy, and custom data.
5. Membership system: types, grants, ledger, manager grant management.
6. Registration engine: atomic registration, approval, capacity, membership bypass, stock consumption and restoration.
7. Frontend product shell: admin/user views against the reusable API.
8. Local Supabase verification: SQL/RLS regression checks and Edge Function smoke tests.

## Acceptance Criteria

- The design supports one Eden product key today while sharing one Supabase project across future products/sites.
- One Supabase Auth user can be associated with multiple products through separate product access rows.
- Manager permissions are scoped per product key.
- Platform admin permissions are restricted to the project owner through protected backend/operator flows.
- Platform admin can assign managers but cannot perform manager-only class or membership management actions.
- Managers can promote additional managers only inside their own product.
- Users can register for classes according to class policy.
- Managers can create templates, schedule classes, and choose approval behavior.
- Managers can create membership types and grant memberships to users.
- Membership modes support infinite, limited, stock, and limited stock.
- Membership-backed registration can bypass approval when the class policy allows it.
- Membership stock consumption is atomic and auditable.
- RLS prevents cross-product data access.
- API boundaries are reusable by future websites, not coupled to Eden-specific UI.
- Product key spoofing is not enough to mutate another product because mutating APIs check both origin binding and product-scoped user authorization.

## Product Access Table

Use one table for product access and product role:

- `product_users`
  - `product_id`
  - `user_id`
  - `role` with values `manager` or `user`
  - lifecycle/status fields as needed
  - audit timestamps

The logical key is `(product_id, user_id)`. This lets the same Supabase Auth user be a manager in one product and a user in another. Product-scoped domain tables should include `product_id`, and most product/user lookups should have indexes on both `product_id` and `user_id`.

## Assumptions

- Payments and selling memberships are out of scope.
- Attendance reminders and waitlists are out of scope for the first implementation. Detailed schedule generation behavior is owned by `docs/2026-06-06-schedule-system/spec.md`, not this root product spec.
- The local Supabase stack is the development backend.
- Edge Functions are the only application API exposed to frontend projects; Postgres/RPC should own transactional class and membership decisions behind that API.
- The public website may remain Eden-specific while the backend and core product UI stay product-key-aware.

## Open Questions

Open questions are tracked in `agenda.md`. The highest-risk product-boundary questions are now answered: one shared Supabase backend, product-key scoping, domain/origin binding, and combined `product_users` access rows.
