# Class Management Product Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- The product should be agnostic and reusable across Eden and other teacher/vendor websites.
- All implementations should work against one shared Supabase backend/project.
- Product separation should happen through a `product_key` boundary.
- Systems to design: roles/users/permissions, classes, memberships, and class-membership interaction.
- Roles are `admin`, `manager`, and `user`: admin is the platform owner, managers are client businesses, and users are the clients' customers.
- Managers can create classes, manage schedules, manage templates, and choose auto-register vs require-approval.
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
- Spec impact: The spec now treats product key as the product boundary and recommends shared physical tables with product-scoped rows, RLS, and APIs.
- Durable-artifact check: Captured `Product` and `Product Key` in `CONTEXT.md`. Created ADR 0001 because shared Supabase product scoping is durable, hard to reverse, and had real alternatives.
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
- Durable-artifact check: Captured `Product Key` in `CONTEXT.md`. Covered by ADR 0001 as part of shared product scoping; no separate ADR needed because origin binding is an implementation consequence of the same boundary decision.
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
- Durable-artifact check: Captured `Platform Admin`, `Manager`, `User`, and `Service Role` in `CONTEXT.md`. No separate ADR: this is role vocabulary and permission policy under the broader product-scoping architecture.
- Follow-ups: Decide how new products and their first manager are bootstrapped by the platform admin.

### Question 3: Class model granularity

- Status: Answered
- Branch type: Initial
- Why it matters: Templates and scheduled class occurrences are different objects. Combining them makes schedule edits and reusable class setup harder later.
- Scenario probe: A manager creates "Beginner Salsa" as a reusable class template and schedules it every Tuesday, then changes next Tuesday's capacity only. The template should not be rewritten accidentally.
- Options:
  - A. Separate `class_templates` and `class_occurrences`.
  - B. Only `classes`, where every scheduled instance repeats all details.
  - C. Start with `classes`, but add optional `template_id` for future reuse.
- Recommendation: A. The user explicitly wants template management, so separating the concepts now is simpler than migrating later.
- Answer: Use three layers. A class is a concrete date-bound object with capacity, location, attendance/registration list, and global plus product-specific properties. A template is an interface/schema for a class, not a concrete registerable object. A schedule is a separate time-management tool that places templates on repeating/planned dates.
- Answer impact: Changes model
- Spec impact: The spec now models class templates, schedules, and concrete classes as separate systems. Templates define class data structure, schedules manage recurrence/time placement, and classes are registerable date-bound objects.
- Durable-artifact check: Captured `Class Template`, `Schedule`, and `Class` in `CONTEXT.md`. No ADR yet because this is domain modeling; it may become an ADR if later implementation pressure pushes toward collapsing the layers.
- Follow-ups: Ask which class fields are global engine fields versus product-specific custom fields.

### Question 4: Membership requirement semantics

- Status: Answered
- Branch type: Initial
- Why it matters: "Requires membership" can mean "non-members cannot register" or "non-members require approval while members auto-register." Those are different products.
- Scenario probe: A class is popular. The teacher wants members to get instant spots, but non-members may still request approval if seats remain. Is that a membership-required class or a require-approval class with membership bypass?
- Options:
  - A. Strict membership-required — non-members cannot register at all.
  - B. Membership bypass — non-members can request approval, members auto-register.
  - C. Both modes — each class chooses strict membership-required, open registration, or approval-with-member-bypass.
- Recommendation: C. It is slightly more expressive but matches your stated "classes clarify if they require membership" plus "membership bypasses require-approval" requirements.
- Answer: Keep visibility, membership requirement, and registration policy separate. Members are product users with an active membership grant: infinite, limited/timed, stock, or limited/timed stock. `visibility = members_only` means non-members do not see the class as registrable. `membership_requirement = required` means a user must have membership to attempt registration. `registration_policy` controls approval: default member-backed registrations can be auto-approved, but a special approval-required policy forces even members into manager approval.
- Answer impact: Changes model
- Spec impact: The spec now defines membership as entitlement on a product user, separates class visibility from registration eligibility, and adds an approval-required registration policy that applies even to members.
- Durable-artifact check: Captured `Member` in `CONTEXT.md`; registration policy names are schema values and do not need glossary entries. No ADR needed because this is domain/access semantics rather than a broad architectural decision.
- Follow-ups: Resolved in Questions 17 and 18.

### Question 16: Visibility, membership requirement, and registration policy interaction

- Status: Answered
- Branch type: Follow-up
- Why it matters: These fields can overlap unless each has one responsibility.
- Scenario probe: One class is visible to everyone but non-members need approval while members are auto-approved. Another class is visible only to members. Another special class requires manager approval even for members.
- Options:
  - A. Separate concerns: visibility controls discovery, membership requirement controls registration eligibility, registration policy controls approval.
  - B. Membership requirement drives visibility and approval behavior.
  - C. Use a single class access mode.
- Recommendation: A. It keeps configuration explicit and supports all stated scenarios.
- Answer: A. Visibility controls whether non-members see the class as registrable. Membership requirement controls whether membership is required to attempt registration. Registration policy controls whether eligible users are approved immediately or require manager approval, including an approval-only policy that applies to members too.
- Answer impact: Confirms branch
- Spec impact: The spec now treats these as three independent fields with distinct responsibilities.
- Durable-artifact check: Covered by adding `Member` to `CONTEXT.md`; no ADR needed.
- Follow-ups: Resolved in Question 18.

### Question 17: Registration policy enum names

- Status: Answered
- Branch type: Follow-up
- Why it matters: Registration policy names need to make approval behavior clear, especially because one policy allows member auto-approval while another requires approval even for members.
- Scenario probe: A future implementer sees `require_approval`; they might assume members also require approval, even though the intended default is that members can bypass approval.
- Options:
  - A. `auto_approve`, `member_auto_approve`, `approval_required`.
  - B. `auto_register`, `require_approval`, `approval_required`.
  - C. `open`, `members_bypass`, `manual_approval`.
- Recommendation: A. It makes the member-bypass behavior explicit and avoids ambiguity.
- Answer: A. Use `auto_approve`, `member_auto_approve`, and `approval_required`.
- Answer impact: Resolves branch
- Spec impact: The spec now uses explicit registration policy enum names and removes the ambiguous earlier `auto_register` / `require_approval` wording.
- Durable-artifact check: No `CONTEXT.md` update needed; enum names are schema/API vocabulary already explained in the spec. No ADR needed.
- Follow-ups: None.

### Question 18: Default registration policy

- Status: Answered
- Branch type: Follow-up
- Why it matters: Defaults shape manager behavior. A permissive default reduces friction, but a cautious default avoids accidental auto-approvals.
- Scenario probe: A manager creates a new class quickly and does not touch the registration policy field. The system needs a predictable default that matches the common case.
- Options:
  - A. `member_auto_approve`.
  - B. `approval_required`.
  - C. `auto_approve`.
- Recommendation: A. It matches the common model where members get smooth access while non-members need approval.
- Answer: A. Default new templates/classes to `member_auto_approve`.
- Answer impact: Confirms branch
- Spec impact: The spec now states that `member_auto_approve` is the default registration policy.
- Durable-artifact check: No `CONTEXT.md` update needed; this is a schema default. No ADR needed.
- Follow-ups: None.

### Question 13: Global class fields and attendance model

- Status: Answered
- Branch type: Follow-up
- Why it matters: Global fields become stable API/schema contract. Attendance also affects registration, walk-ins, trials, reporting, and conversion from trial to product user.
- Scenario probe: A new student appears at a class without registering and without an account. A manager needs to record them as a trial attendee without pretending they are a product user or a registered attendee.
- Options:
  - A. One `class_participants` model with type/status for registered user, walk-in user, and trial.
  - B. Separate registration, attendance, and trial tables.
  - C. Registrations table plus separate trials table.
- Recommendation: A. A unified participation model gives one lifecycle and reporting surface while still distinguishing registered users, walk-ins, and trials.
- Answer: A. Use one participation model. Product-user participants reference product users. Trial participants store trial contact/name fields and can later be converted or linked to a product user.
- Answer impact: Resolves branch
- Spec impact: The spec now models attendance/trials through a unified `class_participants` model with participant type/status and constraints for product-user versus trial participants.
- Durable-artifact check: Captured `Attendance`, `Walk-in`, `Trial`, and `Class Participant` in `CONTEXT.md`. No ADR needed because this is domain modeling, not a hard-to-reverse architectural tradeoff beyond the current spec.
- Follow-ups: Resolved in Questions 22 and 23.

### Question 14: Concrete class global fields

- Status: Answered
- Branch type: Follow-up
- Why it matters: These fields become the stable class API. Anything not here must come from template-defined custom data or related tables.
- Scenario probe: Eden needs `level` and `instructor`, while another product needs `coach` and `room setup`. Global fields should avoid becoming a product-specific dumping ground.
- Options:
  - A. Lean global set plus `description`, `category`, `visibility`, and `notes`.
  - B. Broad global metadata including `level` and `instructor`.
  - C. Split display fields from engine fields into a separate details shape/table.
- Recommendation: A. The chosen additions are common display/operations fields; `level` and `instructor` are more product-specific.
- Answer: A. Global class fields include product/template/schedule ids, name, description, category, start/end, capacity, location, status, visibility, registration policy, membership requirement, notes, custom data, and audit fields. `level` and `instructor` stay product-specific template fields.
- Answer impact: Resolves branch
- Spec impact: The spec now names the global class fields and explicitly keeps `level` and `instructor` out of the global class schema.
- Durable-artifact check: No `CONTEXT.md` update needed; these are field decisions, not domain terms. No ADR needed because this is schema detail within the broader class model.
- Follow-ups: Resolved in Question 15.

### Question 15: Class status versus visibility

- Status: Answered
- Branch type: Follow-up
- Why it matters: Status controls lifecycle; visibility controls who can see or access the class. Blending them makes operational and access rules harder to reason about.
- Scenario probe: A manager prepares a class that exists operationally but is not visible yet. Later, they may want a class visible only to members.
- Options:
  - A. Separate publication status from visibility.
  - B. Single field combines publication, visibility, cancellation, and completion.
  - C. Separate but minimal visibility: public/hidden only.
- Recommendation: A. It matches the mental model and keeps lifecycle separate from access/display.
- Answer: A. Use separate publication status and visibility fields. Later pressure testing refined this further: `status` tracks draft/published publication state, `lifecycle_status` tracks created/cancelled/in-progress/completed operational state, and `visibility` tracks public/hidden/member-only access.
- Answer impact: Confirms branch
- Spec impact: The spec now defines `status` as `draft`, `published`; `lifecycle_status` as `created`, `cancelled`, `in_progress`, `completed`; and `visibility` as `public`, `hidden`, `members_only`.
- Durable-artifact check: No `CONTEXT.md` update needed; this is schema semantics, not new domain language. No ADR needed because it is not a broad architectural tradeoff.
- Follow-ups: Resolved in Questions 4 and 16.

### Question 5: Membership stock restoration

- Status: Answered
- Branch type: Initial
- Why it matters: Stock memberships need deterministic behavior on cancellations, class cancellations, and admin corrections.
- Scenario probe: A user spends one stock entry on a class, then cancels two hours before class. Another user cancels after the class starts. The system must decide whether both, one, or neither get stock back.
- Options:
  - A. Restore stock for any cancellation before class start; do not restore after start except admin correction.
  - B. Never auto-restore stock; admins manually correct.
  - C. Restore only when admin cancels the class, not when user cancels.
- Recommendation: A. It is the least surprising for users and keeps admin workload down, while still preventing post-class abuse.
- Answer: A. Restore stock for user cancellation before class start and for manager class cancellation. Do not restore after class start except explicit manager/platform-admin correction.
- Answer impact: Confirms branch
- Spec impact: The spec now defines stock restoration behavior and requires restoration to be recorded through the membership usage ledger.
- Durable-artifact check: No `CONTEXT.md` update needed; stock restoration is policy behavior under existing membership terms. No ADR needed.
- Follow-ups: Resolved in Question 25.

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
- Durable-artifact check: Covered by ADR 0001's Edge Function/API boundary language. No glossary update needed beyond existing service/product terms.
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
- Durable-artifact check: Covered by ADR 0001 as a durable API boundary decision. No new glossary term needed.
- Follow-ups: Future endpoint design should include read endpoints as well as mutation endpoints.

### Question 7: Deterministic membership consumption order

- Status: Answered
- Branch type: Initial
- Why it matters: Users can have multiple valid memberships. Stock consumption must be predictable and explainable.
- Scenario probe: A user has one limited-stock grant expiring tomorrow and one infinite grant. They register for a class today. Which membership should the backend attach to the registration?
- Options:
  - A. Consume expiring/limited stock first, then non-expiring stock, then unlimited memberships.
  - B. Prefer unlimited memberships first to preserve paid stock.
  - C. Let admin configure priority per membership type.
- Recommendation: A for v1. It avoids wasting expiring entitlements and does not add admin configuration complexity.
- Answer: V1 should not allow more than one active membership type per product user. Membership modes have an upgrade order from lowest to highest: `stock`, `limited_stock`, `limited`, `infinite`. A user can upgrade from one mode to a higher mode, but the backend must replace or close the previous active grant so registration never chooses between multiple active memberships.
- Answer impact: Changes model
- Spec impact: The spec now removes multi-membership consumption ordering from v1 and adds a one-active-membership-per-product-user invariant plus membership upgrade hierarchy.
- Durable-artifact check: `Member` already exists in `CONTEXT.md`. Add `Membership Grant` after grant lifecycle is settled. No ADR needed yet because this is v1 business policy and can be revisited without changing the shared product architecture.
- Follow-ups: Resolved in Question 19.

### Question 19: Membership upgrade behavior

- Status: Answered
- Branch type: Follow-up
- Why it matters: Upgrading from stock to limited or infinite may leave unused entries. Handling value carryover creates accounting complexity.
- Scenario probe: A user has 4 stock entries left and the manager upgrades them to limited. The system needs a simple v1 rule for the old grant.
- Options:
  - A. Replace old membership immediately; old grant becomes inactive and new grant starts fresh.
  - B. Carry remaining stock/value into the new grant as notes/credit.
  - C. Schedule upgrade after old membership is exhausted/expires.
- Recommendation: A for v1. Keep upgrade mechanics simple until payments/value accounting exists.
- Answer: A. V1 uses the simple replacement behavior. The manager is responsible for business handling of unused stock/value outside the product. This is not a main goal for v1 and can be improved later.
- Answer impact: Confirms branch
- Spec impact: The spec now states that upgrades immediately close/replace the previous active membership grant and explicitly excludes credits/refunds/value carryover/scheduled upgrades from v1.
- Durable-artifact check: No `CONTEXT.md` update needed; this is lifecycle policy. No ADR needed because it is a deliberately simple v1 behavior and reversible later.
- Follow-ups: None.

### Question 10: Product bootstrap and first manager assignment

- Status: Answered
- Branch type: Follow-up
- Why it matters: Every product needs a `product_key`, allowed origins, and at least one manager before the class/membership system can be used. This is also where platform `admin` authority matters most.
- Scenario probe: Eden signs into Eden's website. Her account is associated with the Eden product key from the domain. The platform admin then sees Eden's product users in the Eden context and promotes Eden to manager.
- Options:
  - A. Platform admin creates product + first manager manually through protected Edge Functions.
  - B. Self-serve signup creates product + makes signer first manager.
  - C. Hybrid: platform admin creates product, manager completes setup.
- Recommendation: A. It keeps product creation and first-manager assignment intentional and operator-controlled.
- Answer: A. Product creation and initial manager assignment are controlled by the platform admin. Each frontend implementation has domain/product-key binding. Signups through that domain are associated with the matching product. The admin can view users in that product context and promote users to manager. Managers can promote other users to manager within their own product.
- Answer impact: Changes model
- Spec impact: The spec now defines admin as platform role-management authority only: admin can create products/origins and assign managers, but cannot create classes or memberships. Managers own operational product management.
- Durable-artifact check: Captured role responsibilities in `CONTEXT.md`. No new ADR needed because this refines the role model already covered by the glossary and ADR 0001.
- Follow-ups: User association resolved in Question 11. Role capability matrix is reflected in the spec responsibility split.

### Question 11: Domain signup association

- Status: Answered
- Branch type: Follow-up
- Why it matters: One Supabase Auth user can interact with multiple products. The system needs a product-level access row so managers/admins can see and manage users in the correct product context.
- Scenario probe: A person signs up on Eden's website, then later signs up on another client's website under the same shared Supabase project. They should reuse the same Supabase Auth identity if the email/provider matches, but they still need separate product access rows for Eden and the second product.
- Options:
  - A. Auto-associate on first successful login/signup from an allowed domain.
  - B. Associate only when the person performs a product action, like registering for a class.
  - C. Manager/admin approval before association.
- Recommendation: A. Since each frontend is domain-bound to a product, login through that site should create the product-user relationship immediately.
- Answer: A. Signing in through a product website creates or confirms a product-level user/member row for that product. Existing Supabase Auth identity can be reused across products, but each product still needs its own access row.
- Answer impact: Confirms branch
- Spec impact: The spec now explicitly separates global Supabase Auth identity from product-level access rows.
- Durable-artifact check: Captured `Product User` and its relationship to Supabase Auth identity in `CONTEXT.md`. Covered by ADR 0001; no separate ADR needed.
- Follow-ups: Product access table shape resolved in Question 12.

### Question 12: Product access and role table shape

- Status: Answered
- Branch type: Follow-up
- Why it matters: This is the core multi-tenant permission model. It affects manager promotion, user lists, RLS checks, membership grants, and how easy it is to answer "who belongs to this product?"
- Scenario probe: The same Supabase Auth user signs into Eden and another client product. They are a manager in Eden and a user in the other product. The system needs one global identity with distinct product-scoped access and role state.
- Options:
  - A. One table: `product_users(user_id, product_id, role)`.
  - B. Split tables: `product_users` for access plus `product_roles` for roles.
  - C. Role rows only: `product_roles(user_id, product_id, role)` doubles as access.
- Recommendation: A. Since roles are currently `manager` and `user`, one row per user/product with a single role is simpler and enough.
- Answer: A. Use a `products` table and a single `product_users` table keyed by `(product_id, user_id)` with the product-scoped role. Domain tables should carry `product_id`; most product/user tables should index both `product_id` and `user_id`.
- Answer impact: Confirms branch
- Spec impact: The spec now uses `product_users` as the combined product access and role table and removes separate `product_roles` from the candidate model.
- Durable-artifact check: Updated `CONTEXT.md` with product/user terminology. Covered by ADR 0001 because the shared-backend product-scoped table model is a durable architectural decision with real alternatives.
- Follow-ups: Membership grants should reference `product_id` and `user_id`; decide later whether they reference `product_users` directly or use `(product_id, user_id)` checks.

### Question 20: Class template schema capabilities

- Status: Answered
- Branch type: Pressure-test
- Why it matters: We decided that a class template is an interface/schema, not a concrete class. Without deciding what that schema can express, implementers may either underbuild templates as simple defaults or overbuild a form-builder platform.
- Scenario probe: Eden wants each class to capture `level` and `instructor`; another product wants `coach`, `equipment`, and `room setup`. Managers need enough flexibility without creating arbitrary unsafe data that the app cannot render or validate.
- Options:
  - A. Simple typed custom fields: text, number, boolean, select, multi-select, date, URL, and long text; each field has key, label, required flag, default value, and visibility/search flags.
  - B. Full JSON-schema-like templates with nested objects, arrays, validation expressions, and conditional logic.
  - C. Minimal key-value fields only, no types or validation beyond text.
- Recommendation: A. It is flexible enough for product-specific class fields while keeping rendering, validation, and future filtering tractable.
- Answer: A. Templates support simple typed custom fields: text, long text, number, boolean, select, multi-select, date, and URL. Each field has a stable key, label, type, required flag, optional default value, and optional visibility/search flags.
- Answer impact: Confirms branch
- Spec impact: The spec now defines template schema capabilities and explicitly excludes nested schemas, arrays, validation expressions, and conditional logic from v1.
- Durable-artifact check: No `CONTEXT.md` update needed; `Class Template` is already captured and these are implementation capabilities. No ADR needed because this is v1 scope control, not broad architecture.
- Follow-ups: Decide if `visibility/search flags` are needed in v1 or should be reserved for later filtering.

### Question 21: Schedule-to-class generation behavior

- Status: Non-blocking Risk
- Branch type: Pressure-test
- Why it matters: Schedule is a time-management tool, but classes are the registerable objects. We need to decide when schedule entries become concrete classes and how managers control generated instances.
- Scenario probe: A manager schedules a template every Tuesday for three months, then wants to cancel one Tuesday and change another Tuesday's capacity. The system must avoid duplicate generated classes and preserve per-class overrides.
- Options:
  - A. Schedule generates concrete classes for a selected date range when the manager publishes or refreshes the schedule; generated classes can then be individually edited/cancelled.
  - B. Schedule stays virtual until users view/register; concrete class rows are created lazily on demand.
  - C. Schedule never generates automatically; managers manually create classes from templates.
- Recommendation: A. It gives managers concrete registerable classes, supports overrides, and avoids surprising lazy creation behavior.
- Answer: Deferred to a separate schedule-system design folder/spec. The global product spec only defines Schedule as a separate time-management system that places class templates onto dates and eventually produces concrete classes.
- Answer impact: Resolves branch
- Spec impact: The global spec keeps the Schedule boundary but does not decide recurrence, generation windows, duplicate prevention, or override behavior.
- Durable-artifact check: `Schedule` is already captured in `CONTEXT.md`. No ADR needed; the detailed scheduling lifecycle is intentionally deferred to a child spec.
- Follow-ups: Create a separate schedule-system spec/agenda before implementing schedule-dependent chunks.

### Question 22: Class participant registration and attendance statuses

- Status: Answered
- Branch type: Pressure-test
- Why it matters: We chose one participation model for registered users, walk-ins, and trials. Registration approval and physical attendance are different lifecycle axes.
- Scenario probe: A user requests a class and is pending. A manager approves them. They attend. Another approved user does not show. A trial appears without an account. A walk-in product user attends without registering.
- Options:
  - A. Unified participant statuses: `pending`, `approved`, `rejected`, `cancelled`, `attended`, `no_show`.
  - B. Split registration status from attendance status.
  - C. Minimal v1: `pending`, `approved`, `cancelled`, `attended`.
- Recommendation: B. A user can be approved and later absent; a walk-in/trial can be present without registration approval.
- Answer: B. Registration status is `pending`, `approved`, `rejected`, `cancelled`. Attendance status is `present` or `absent`. Managers start a class through a transactional RPC/Edge Function flow, mark registered users present/absent, add product-user walk-ins, and add trial users. Trials are present by default.
- Answer impact: Confirms branch
- Spec impact: The spec now separates registration status from attendance status and adds a manager class-start attendance workflow.
- Durable-artifact check: Updated `CONTEXT.md` to clarify registration versus attendance and trial default presence. No ADR needed because this is domain lifecycle modeling.
- Follow-ups: Resolved in Question 23.

### Question 23: Class lifecycle status and registration cutoff

- Status: Answered
- Branch type: Pressure-test
- Why it matters: Class publication state, operational lifecycle, and visibility are distinct. Registration cutoff must be explicit so users cannot register after class start or after the class date has passed.
- Scenario probe: A manager starts class attendance. Registration should immediately stop. A user also should not be able to register on June 17 for a class that happened on June 16, even if the manager forgot to complete it.
- Options:
  - A. Keep `status` for draft/published and add manual `lifecycle_status` for created/cancelled/in_progress/completed.
  - B. Replace status with lifecycle only.
  - C. Keep one status field with all values.
- Recommendation: A. It preserves publication state while adding manual operational lifecycle.
- Answer: A. Use `status = draft/published` for publication state and `lifecycle_status = created/cancelled/in_progress/completed` for manual class lifecycle. Starting a class changes lifecycle to `in_progress`; finalizing changes it to `completed`. Registration is blocked when the class is in progress, cancelled, completed, or past the date/start cutoff.
- Answer impact: Changes model
- Spec impact: The spec now separates `status`, `lifecycle_status`, and `visibility`, and adds registration cutoff rules for in-progress/past classes.
- Durable-artifact check: No `CONTEXT.md` update needed; this is schema/lifecycle policy using existing `Class` language. No ADR needed.
- Follow-ups: Resolved in Question 24.

### Question 24: Registration cutoff deadline

- Status: Answered
- Branch type: Pressure-test
- Why it matters: Some classes may allow registration until start time; others may need cutoff hours earlier. V1 should be explicit to avoid accidental extra policy work.
- Scenario probe: A class starts at 18:00. At 18:01, a user should not be able to register even if the manager has not started/finalized the class.
- Options:
  - A. V1 cutoff is exactly `starts_at`.
  - B. Add per-class `registration_closes_at`.
  - C. Product-level default cutoff with optional per-class override.
- Recommendation: A for v1, with B as the natural v2 evolution.
- Answer: A for v1. Registration closes at `starts_at`. B is the explicit v2 path: add per-class `registration_closes_at`.
- Answer impact: Confirms branch
- Spec impact: The spec now uses `starts_at` as the v1 registration cutoff and names `registration_closes_at` as a v2 evolution.
- Durable-artifact check: No `CONTEXT.md` update needed; this is lifecycle policy. No ADR needed.
- Follow-ups: None.

### Question 25: Membership ledger event types

- Status: Answered
- Branch type: Pressure-test
- Why it matters: Membership actions need an audit trail. Stock-affecting events change balance, but non-stock membership actions are also useful for debugging, reporting, and manager accountability.
- Scenario probe: A stock member registers and consumes one entry, cancels before class starts and restores it, then later a manager changes their membership type. The ledger should explain every membership-backed action.
- Options:
  - A. Minimal stock ledger: `consume`, `restore`, `adjust`.
  - B. Explicit membership-action ledger: class registration, user cancellation, class cancellation, manager adjustment, membership type change, with stock deltas where relevant.
  - C. Full accounting ledger including payment/refund/credit-like events.
- Recommendation: B. It gives strong audit/debug value without entering payment/accounting scope.
- Answer: B, generalized to every membership type. Write ledger events for every membership-backed action: registering to a class, cancelling registration, class cancellation restoration, manager adjustment, and membership type change. Stock membership events include quantity deltas; non-stock membership events record context only.
- Answer impact: Changes model
- Spec impact: The spec now treats the membership ledger as an action/audit ledger for all membership types, not only a stock usage ledger.
- Durable-artifact check: Captured `Membership Ledger` in `CONTEXT.md`. No ADR needed because this is domain/audit policy, not broad architecture.
- Follow-ups: Final event names can be refined during membership child spec/planning.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, sequencing, user review points.
- Result: The global product spec is sufficient as a root contract. Schedule generation behavior is intentionally deferred to a separate schedule-system spec/agenda. Detailed Edge Function endpoint shapes and membership ledger event names can be resolved during child specs or chunk planning without changing the global model.
- Remaining non-blocking risks:
  - Schedule implementation must not begin until the separate schedule-system design is approved.
  - API endpoint shapes need to be mapped during planning from the resolved Edge-Function-only boundary.
  - Membership ledger event names should be finalized in the membership child spec or membership implementation plan.
