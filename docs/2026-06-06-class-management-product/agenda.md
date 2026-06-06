# Class Management Product Design Agenda

## Status

- Spec: `spec.md`
- State: Working Draft
- Completion gate:
  - Live agenda questions resolved: No
  - Pressure test complete: No
  - Spec finalized: No

## Documented Decisions

- The product should be agnostic and reusable across Eden and other teacher/vendor websites.
- All implementations should work against one shared Supabase backend/project.
- Product separation should happen through a `product_key` boundary.
- Systems to design: roles/users/permissions, classes, memberships, and class-membership interaction.
- Roles are `admin`, `manager`, and `user`: admin is the platform owner, managers are client businesses, and users are the clients' customers.
- Admins can create classes, manage schedules, manage templates, and choose auto-register vs require-approval.
- Membership selling is out of scope; managers manually grant memberships to users.
- Membership modes are infinite, limited, stock, and limited stock.
- Classes should clarify whether membership is required.
- Local Supabase stack is available and should be used later for implementation and verification.
- Supabase Edge Functions are acceptable and likely part of the product API layer.

## Questions

### Question 1: Product-key boundary for the agnostic SaaS product

- Status: Answered
- Branch type: Initial
- Why it matters: The product-key model determines every permission policy, every membership grant, every class query, and whether this is one shared SaaS backend or several copied Supabase projects.
- Scenario probe: Eden and a second teacher both use the product against the same Supabase backend. The same person is a manager for Eden but only a class attendee for the second teacher. Their Eden membership must not register them into the second teacher's classes.
- Options:
  - A. Product-scoped from day one — every role, class, template, membership, grant, and registration belongs to a product key in one shared Supabase backend.
  - B. Separate Supabase project per implementation — copy schema/functions into each product backend.
  - C. Separate physical tables per product inside one Supabase project.
- Recommendation: A. It gives the shared backend you want without multiplying tables or deployments.
- Answer: Use one Supabase backend/project. Multiple websites/products copy the integration logic but all work against the same backend. Separation happens by product key. A manager role applies only to that user's product/project data.
- Answer impact: Changes model
- Spec impact: The spec now treats product key as the tenant boundary and recommends shared physical tables with product-scoped rows, RLS, and APIs.
- Follow-ups: Question 8 added to decide how products are provisioned and how a frontend proves/declares its product key.

### Question 8: Product-key provisioning and frontend binding

- Status: Answered
- Branch type: Follow-up
- Why it matters: If every website points at the same backend, the backend must know which product key the request belongs to and must prevent users from spoofing a different product key.
- Scenario probe: Eden's frontend sends `product_key = eden`. A malicious user changes the request to `product_key = other_teacher`. The backend must reject actions unless the user's role/membership is valid for `other_teacher`.
- Options:
  - A. Public product key, secured by RLS membership/role checks — the key is not secret; every query/mutation validates the user's relationship to that product.
  - B. Secret product key per frontend — each site has a private key, but static websites cannot safely keep it secret.
  - C. Domain-bound product lookup — Edge Function derives product from request origin/domain and ignores client-provided product key for mutations.
- Recommendation: A for v1, with C as a later hardening layer for deployed websites. Product key should identify scope, not authorize access.
- Answer: Use both A and C. `product_key` is public and still validated by product-scoped role/membership checks. Edge Functions also verify that the request origin/domain is allowed for that product key. During development, localhost origins are registered and checked too.
- Answer impact: Changes model
- Spec impact: The spec now requires `product_key` as a public scope identifier plus server-side product origin/domain binding for mutating APIs. It adds `product_allowed_origins` as a candidate table and explicitly rejects product-key secrecy as the authorization mechanism.
- Follow-ups: The canonical API boundary question is now higher priority, because origin/domain enforcement strongly favors Edge Functions in front of transactional RPCs.

### Question 2: Application roles and service-role boundary

- Status: Answered
- Branch type: Initial
- Why it matters: Supabase request roles are not product roles. The app needs a platform `admin` role for the product owner, product-scoped `manager/user` permissions for clients and their customers, and private `service_role` usage only inside trusted backend/operator flows.
- Scenario probe: You are platform admin and can maintain products across the shared backend. A client is manager for Eden but a normal user for another product. The same authenticated Supabase account must be able to manage Eden classes but not the other product's classes. No manager should receive service-role powers.
- Options:
- A. Roles are `admin`, `manager`, and `user`; `admin` is platform-level, while `manager/user` are product-scoped.
- B. Roles are only `manager` and `user`; platform admin is handled outside the app entirely.
- C. Roles are `owner`, `manager`, and `user` per product, with no platform admin role.
- Recommendation: A. It matches the desired hierarchy: you own the platform, clients manage their product data, and their customers use the class/membership flows.
- Answer: Use application roles `admin`, `manager`, and `user`. `admin` is the platform owner role for protected backend/operator flows. `manager` is product-scoped and belongs to client businesses. `user` is product-scoped and belongs to the clients' customers. Supabase `service_role` remains a server-side capability, not a role granted to managers or users.
- Answer impact: Changes model
- Spec impact: The spec now defines three application roles and separates platform admin authority from Supabase service-role mechanics. It also requires last-manager protection as a manager-management invariant.
- Follow-ups: Decide how new products and their first manager are bootstrapped by the platform admin.

### Question 3: Class model granularity

- Status: Open
- Branch type: Initial
- Why it matters: Templates and scheduled class occurrences are different objects. Combining them makes schedule edits and reusable class setup harder later.
- Scenario probe: An admin creates "Beginner Salsa" as a reusable class template and schedules it every Tuesday, then changes next Tuesday's capacity only. The template should not be rewritten accidentally.
- Options:
  - A. Separate `class_templates` and `class_occurrences`.
  - B. Only `classes`, where every scheduled instance repeats all details.
  - C. Start with `classes`, but add optional `template_id` for future reuse.
- Recommendation: A. The user explicitly wants template management, so separating the concepts now is simpler than migrating later.
- Answer:
- Answer impact:
- Spec impact:
- Follow-ups:

### Question 4: Membership requirement semantics

- Status: Open
- Branch type: Initial
- Why it matters: "Requires membership" can mean "non-members cannot register" or "non-members require approval while members auto-register." Those are different products.
- Scenario probe: A class is popular. The teacher wants members to get instant spots, but non-members may still request approval if seats remain. Is that a membership-required class or a require-approval class with membership bypass?
- Options:
  - A. Strict membership-required — non-members cannot register at all.
  - B. Membership bypass — non-members can request approval, members auto-register.
  - C. Both modes — each class chooses strict membership-required, open registration, or approval-with-member-bypass.
- Recommendation: C. It is slightly more expressive but matches your stated "classes clarify if they require membership" plus "membership bypasses require-approval" requirements.
- Answer:
- Answer impact:
- Spec impact:
- Follow-ups:

### Question 5: Membership stock restoration

- Status: Open
- Branch type: Initial
- Why it matters: Stock memberships need deterministic behavior on cancellations, class cancellations, and admin corrections.
- Scenario probe: A user spends one stock entry on a class, then cancels two hours before class. Another user cancels after the class starts. The system must decide whether both, one, or neither get stock back.
- Options:
  - A. Restore stock for any cancellation before class start; do not restore after start except admin correction.
  - B. Never auto-restore stock; admins manually correct.
  - C. Restore only when admin cancels the class, not when user cancels.
- Recommendation: A. It is the least surprising for users and keeps admin workload down, while still preventing post-class abuse.
- Answer:
- Answer impact:
- Spec impact:
- Follow-ups:

### Question 6: Canonical API boundary

- Status: Answered
- Branch type: Initial
- Why it matters: The API shape determines whether the product is reusable across multiple frontends or tightly coupled to one Vite app.
- Scenario probe: A future vendor site wants to use this product but has a different frontend. It should call the same class registration and membership APIs without copying Eden-specific client logic.
- Options:
  - A. Direct Supabase client reads plus RPC writes from frontend.
  - B. Edge Functions as the canonical API, with Postgres RPCs handling transactional decisions.
  - C. Edge Functions own all business logic directly with service-role database access.
- Recommendation: B. Edge Functions create a reusable product API, while Postgres RPCs keep capacity and stock decisions atomic and RLS-compatible.
- Answer: B. Edge Functions are the canonical public product API. They validate product key, allowed origin/domain, JWT, and request shape, then call transactional Postgres RPCs for class capacity, approval, and membership-stock decisions.
- Answer impact: Confirms branch
- Spec impact: The spec now treats Edge Functions as the public API boundary and Postgres RPCs as the transactional domain boundary.
- Follow-ups: Registration and membership API shapes must be designed around Edge Function endpoints, not direct frontend RPC calls.

### Question 9: Frontend database access boundary

- Status: Answered
- Branch type: Follow-up
- Why it matters: If frontend projects can call tables or RPCs directly, each copied website can drift and bypass product-level request validation. Edge Functions must be the only supported application API.
- Scenario probe: A future website copies the frontend integration and accidentally calls `class_registrations` directly. That would bypass origin binding and product API validation even if RLS still protects rows.
- Options:
  - A. Frontend projects call only Edge Functions; no direct table or RPC access as app API.
  - B. Frontend can use direct reads, but all writes go through Edge Functions.
  - C. Frontend can use direct Supabase APIs where RLS allows it.
- Recommendation: A. It gives one stable product API and keeps product key/origin/role logic centralized.
- Answer: A. No frontend project should access the database directly. Everything routes through Edge Functions; RLS remains database defense in depth, not the primary product API.
- Answer impact: Changes model
- Spec impact: The spec now says Edge Functions are the only application API exposed to frontend projects. Direct table/RPC access is not part of the supported frontend contract.
- Follow-ups: Future endpoint design should include read endpoints as well as mutation endpoints.

### Question 7: Deterministic membership consumption order

- Status: Open
- Branch type: Initial
- Why it matters: Users can have multiple valid memberships. Stock consumption must be predictable and explainable.
- Scenario probe: A user has one limited-stock grant expiring tomorrow and one infinite grant. They register for a class today. Which membership should the backend attach to the registration?
- Options:
  - A. Consume expiring/limited stock first, then non-expiring stock, then unlimited memberships.
  - B. Prefer unlimited memberships first to preserve paid stock.
  - C. Let admin configure priority per membership type.
- Recommendation: A for v1. It avoids wasting expiring entitlements and does not add admin configuration complexity.
- Answer:
- Answer impact:
- Spec impact:
- Follow-ups:
