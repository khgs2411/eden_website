# Class Management Product Implementation Review

Date: 2026-06-08

## Scope

Reviewed the current implementation against:

- `CONTEXT.md`
- `docs/adr/0001-shared-supabase-product-scoping.md`
- `docs/adr/0002-rolling-schedule-materialization.md`
- `docs/2026-06-06-class-management-product/spec.md`
- `docs/2026-06-06-class-management-product/agenda.md`
- `docs/2026-06-06-class-management-product/plan.md`
- `docs/2026-06-06-class-management-product/plans/*.md`
- Current Supabase migrations, Edge Functions, product frontend shell, and local verification docs.

## Verdict

The implementation is broadly aligned with the approved architecture:

- Shared Supabase backend with `product_key` / `product_id` scoping exists.
- Product roles are represented through `product_users(product_id, user_id, role)`.
- Edge Functions are the frontend product API boundary.
- Service-role usage is confined to Edge Function/server context.
- Class templates, concrete classes, schedules, rolling generation, memberships, registration, attendance, and product UI surfaces are present.
- Local docs and env shape were added.

Do not treat the implementation as fully ready until the findings below are fixed and smoke-tested.

## Merge Trace

The class-management implementation landed on `feature/classes` through no-ff merge commits on first-parent history:

| Merge | Subject | Primary scope | Review implication |
| --- | --- | --- | --- |
| `fcbf575` | Merge product role foundation | Product/RLS foundation | Baseline product tables, helpers, and seed. |
| `aabca7f` | Merge Wave B edge API foundation | Edge Function shared context and manager promotion | Finding 4 originates here. |
| `dbc8ba7` | Merge Wave C frontend product auth shell | Product UI shell and Edge Function client | Frontend uses Edge Functions, no direct table/RPC calls found. |
| `4bbb190` | Merge Wave C membership ledger | Membership tables, grants, ledger, active grant RPC | Findings 1 and 3 originate here. |
| `712329a` | Merge Wave C template and class core | Class templates/classes/RLS/functions | Findings 2 and 5 originate here. |
| `b89a054` | Merge Wave D schedule rule model | Schedule schema/API | Finding 5 remains unresolved here. |
| `2e063fc` | Merge Wave E schedule generation engine | Schedule materialization | Relies on unconstrained `classes.schedule_id`. |
| `e04725a` | Merge Wave F registration engine | Registration/cancellation/RPCs | Finding 3 originates here; Finding 2 is visible in API behavior after this merge. |
| `3bb8855` | Merge Wave G frontend user classes registration | User class UI | Finding 2 becomes user-visible here. |
| `dc1f26d` | Merge Wave G manager class operations UI | Manager class/schedule UI | Uses existing backend contracts. |
| `67b4659` | Merge Wave G attendance engine | Attendance schema/API | No new blocking finding from this pass. |
| `a0606c6` | Merge Wave H manager membership attendance | Manager membership/attendance UI | Uses existing backend contracts. |
| `a42fd2e` | Merge Wave I local verification docs | README/local verification | Docs need to include security regression checks after fixes. |

## Findings

### 1. Authenticated users can execute a security-definer membership lookup for arbitrary users

Severity: Critical

Introduced by: `4bbb190` / Wave C membership ledger.

Evidence:

- `supabase/migrations/20260607132920_membership_ledger.sql` defines `public.get_active_membership_grant(p_product_id uuid, p_user_id uuid)` as `security definer`.
- The function returns `public.membership_grants` and performs `select * from public.membership_grants` using caller-supplied `p_product_id` and `p_user_id`.
- The migration grants `execute` on this function to `authenticated`.
- Local privilege check confirmed: `has_function_privilege('authenticated', 'public.get_active_membership_grant(uuid, uuid)', 'execute') = true`.

Impact:

Any authenticated user can call this RPC directly with another user's UUID and product id to read/probe that user's active membership grant. This bypasses the table RLS policy that otherwise restricts `membership_grants` to self, product managers, or platform admins.

Recommended fix:

Revoke `execute` from `authenticated` and keep it `service_role` only, since frontend product APIs are Edge-Function-only. If a browser-readable membership status endpoint is needed, expose it through an Edge Function or a separate `security invoker`/self-only RPC that enforces `p_user_id = auth.uid()`.

### 2. `members_only` classes are returned to non-members

Severity: High

Introduced by: `712329a` / Wave C template and class core, exposed through `e04725a` registration behavior and `3bb8855` user UI.

Evidence:

- `supabase/functions/classes/index.ts` `list_user` fetches published classes with `visibility in ('public', 'members_only')` for any active product user.
- `supabase/migrations/20260607134535_template_class_core.sql` RLS policy `classes_product_user_read` also allows any active product user to directly select `members_only` classes.
- `supabase/migrations/20260607160000_registration_engine.sql` blocks registration for `members_only` classes when the user has no active membership grant.
- The spec says `visibility` controls whether a class appears as registrable to non-members.

Impact:

Non-members can see member-only class details in the user class list and UI, then hit a backend error only when registering. That violates the discovery/visibility contract.

Recommended fix:

Filter `members_only` classes in both the `classes` Edge Function and the RLS policy based on active membership state. Public classes can remain visible to active product users. Member-only classes should only be returned when an active membership grant exists.

### 3. Membership cancellation ledger is incomplete for non-stock membership-backed registrations

Severity: Medium

Introduced by: `e04725a` / Wave F registration engine, building on `4bbb190` membership ledger.

Evidence:

- The spec requires the Membership Ledger to record every membership-backed action, with stock events carrying deltas and non-stock events carrying audit context.
- `register_for_class` writes `class_registration` ledger rows when a grant is attached, including non-stock grants with `stock_delta = 0`.
- `cancel_class_registration`, manager cancellation, and class cancellation restoration only write cancellation ledger rows when stock was consumed/restored.

Impact:

Infinite/limited membership-backed cancellations are not audit-complete. Stock restoration is correct, but the membership ledger does not explain every membership-backed cancellation.

Recommended fix:

Record `registration_cancelled` / `class_cancelled_restore` ledger events whenever a registration has `membership_grant_id`, using `stock_delta = 0` when no stock was consumed. Keep stock restoration as a separate effect inside the same transaction.

### 4. Product managers can create manager access for arbitrary auth users

Severity: Medium

Introduced by: `aabca7f` / Wave B edge API foundation.

Evidence:

- `supabase/functions/manager-promote-manager/index.ts` requires the caller to be a product manager, then calls `promoteProductManager(ctx.product.id, body.user_id)`.
- `promoteProductManager` uses `upsert` into `product_users` with `{ role: 'manager', status: 'active' }`.
- The spec says managers can promote other users within the same product. It does not give managers authority to associate arbitrary global Supabase Auth users with their product.

Impact:

A product manager who knows or guesses an auth user UUID can create a new active product manager row for that identity. The foreign key limits this to existing auth users, but it still bypasses the intended product-domain association flow.

Recommended fix:

Split platform-admin first-manager assignment from product-manager promotion. Manager promotion should update an existing active `product_users` row for the same product and fail if the target is not already associated with that product.

### 5. Generated class source references are weakly constrained

Severity: Medium

Introduced by: `712329a` / Wave C template and class core; left unresolved by `b89a054` / Wave D schedule rule model.

Evidence:

- `classes.schedule_id` is created as a nullable `uuid` without a foreign key.
- `schedules` later adds `unique (id, product_id)` and product-matched template constraints, but no later migration adds a `(schedule_id, product_id)` foreign key from `classes` to `schedules`.
- Manager class create/update accepts `schedule_id`, `generated_for_date`, and `source_timezone` directly.

Impact:

Classes can carry schedule source metadata that does not correspond to an actual schedule in the same product. That weakens the generated-class snapshot/source contract and can make manager class lists, generation idempotency interpretation, and future schedule cleanup choices unreliable.

Recommended fix:

Add a composite foreign key from `classes(schedule_id, product_id)` to `schedules(id, product_id)` when `schedule_id` is present, and prevent ordinary class CRUD from setting generated source fields unless the operation is the schedule generation path or an explicitly validated manager override path.

## Verification Performed

- `npm run lint`: passed.
- `npm run build`: passed.
  - Vite reported only the existing chunk-size warning.
- `rtk supabase status`: local stack running; optional imgproxy and pooler services stopped.
- `rtk supabase db lint`: passed with non-fatal warnings:
  - unused parameters in `private.consume_registration_stock`
  - unread variable `v_product_user` in `public.register_for_class`
- `rtk supabase migration list --local`: all local migrations through `20260607170000` are applied.
- `rtk supabase db query "select has_function_privilege(...)"`: confirmed `authenticated` can execute `public.get_active_membership_grant(uuid, uuid)`.
- `rtk git log --first-parent --merges feature/classes`: confirmed the class implementation landed through no-ff wave merges.
- `rtk git diff --name-status <merge>^1 <merge>`: mapped each wave merge to introduced files.
- `rtk rg` scans found no direct frontend `supabase.from()` or `supabase.rpc()` calls; frontend product code uses `supabase.functions.invoke()` through `invokeProductFunction`.

## Verification Not Performed

- `supabase db reset` was not run because it is destructive to local data during review.
- Full Edge Function smoke flows were not run because the review did not bootstrap local auth users/JWTs.
- Browser/UI manual checks were not run.

## Follow-Up Checklist

- [ ] Revoke authenticated execute on `public.get_active_membership_grant(uuid, uuid)` or rewrite it as a self-only function.
- [ ] Add regression coverage proving one user cannot call an active-grant lookup for another user.
- [ ] Fix member-only class listing in the `classes` Edge Function and RLS policy.
- [ ] Add regression coverage or a smoke query for non-member user listing.
- [ ] Fix cancellation ledger writes for non-stock membership-backed registrations.
- [ ] Add regression coverage or a smoke query for infinite/limited membership cancellation ledger events.
- [ ] Restrict manager promotion to existing active product users, while preserving platform-admin first-manager bootstrap.
- [ ] Add schedule/source foreign-key integrity for generated class source references.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `rtk supabase db lint`.
- [ ] Run non-destructive Edge Function smoke tests, or run `supabase db reset` only when local data loss is acceptable.
