# Class Management Product Review Fixes Implementation Plan Set

**Spec:** `../../spec.md`
**Agenda:** `../../agenda.md`
**Context:** `../../../../CONTEXT.md` available
**ADRs:** `../../../adr/0001-shared-supabase-product-scoping.md`, `../../../adr/0002-rolling-schedule-materialization.md`
**Status:** Chunk Plans Written

## Goal

Implement the follow-up fixes from the 2026-06-08 implementation review while preserving the approved class-management product architecture: one shared Supabase backend, product-key scoping, Edge-Function-only frontend APIs, RLS defense in depth, rolling generated classes, product-scoped manager permissions, and complete membership audit history.

This is a corrective follow-up plan set. It does not introduce a new product model. It closes review findings against the existing approved spec, agenda, ADRs, and original chunk plan set.

## Source Artifacts

- Root spec: `docs/2026-06-06-class-management-product/spec.md`
- Root agenda: `docs/2026-06-06-class-management-product/agenda.md`
- Original implementation roadmap: `docs/2026-06-06-class-management-product/plan.md`
- Original implementation chunks: `docs/2026-06-06-class-management-product/plans/*.md`
- Review artifact: `docs/2026-06-06-class-management-product/reviews/2026-06-08/implementation-review.md`
- Schedule child spec: `docs/2026-06-06-schedule-system/spec.md`
- Schedule child agenda: `docs/2026-06-06-schedule-system/agenda.md`
- Glossary/context: `CONTEXT.md`
- ADR 0001: `docs/adr/0001-shared-supabase-product-scoping.md`
- ADR 0002: `docs/adr/0002-rolling-schedule-materialization.md`

Code paths inspected:

- `supabase/migrations/20260607112136_product_role_foundation.sql`
- `supabase/migrations/20260607132920_membership_ledger.sql`
- `supabase/migrations/20260607134535_template_class_core.sql`
- `supabase/migrations/20260607143000_schedule_rule_model.sql`
- `supabase/migrations/20260607153000_schedule_generation_engine.sql`
- `supabase/migrations/20260607160000_registration_engine.sql`
- `supabase/migrations/20260607170000_attendance_engine.sql`
- `supabase/functions/_shared/context.ts`
- `supabase/functions/classes/index.ts`
- `supabase/functions/manager-promote-manager/index.ts`
- `supabase/functions/admin-promote-manager/index.ts`
- `supabase/functions/register-class/index.ts`
- `supabase/functions/manage-registrations/index.ts`
- `supabase/functions/memberships/index.ts`
- `supabase/functions/schedules/index.ts`
- `supabase/functions/schedule-generate/index.ts`
- `src/lib/product-api.ts`
- `src/components/product/**`
- `README.md`
- `docs/2026-06-06-class-management-product/local-verification.md`

Test / validation commands discovered:

- `npm run lint`
- `npm run build`
- `rtk supabase status`
- `rtk supabase migration list --local`
- `rtk supabase db lint`
- `rtk supabase db query "<sql>"`
- `supabase functions serve`

Current review evidence:

- `npm run lint`: passed during review.
- `npm run build`: passed during review, with only a Vite chunk-size warning.
- `rtk supabase db lint`: passed during review with non-fatal unused-parameter/variable warnings.
- `rtk supabase migration list --local`: all local migrations through `20260607170000` were applied during review.
- Local privilege check confirmed `authenticated` can execute `public.get_active_membership_grant(uuid, uuid)`.

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: None.
- Open agenda questions or risks:
  - Root agenda is complete.
  - Schedule child agenda is complete.
  - Review findings are implementation defects against settled contracts, not new product decisions.
- Spec / agenda / context / ADR consistency: Pass.
  - ADR 0001 requires shared tables with product scoping, Edge Function checks, transactional database logic, and RLS defense in depth.
  - ADR 0002 requires generated concrete classes to keep source references and behave as snapshots.
  - `CONTEXT.md` says a Manager can promote other Product Users to Manager within the same Product; this excludes creating arbitrary product access for unrelated auth users.
  - The spec requires `members_only` visibility to hide registrable classes from non-members and requires the Membership Ledger to record all membership-backed actions.
- Parent / child spec consistency: Pass.
  - Parent spec owns product, role, membership, registration, and API security boundaries.
  - Schedule child spec owns generated class source/reference behavior and snapshot integrity.
- Accepted planning reconciliations:
  - This follow-up plan treats the review artifact as implementation evidence, not as a replacement spec.
  - The existing public function name `get_active_membership_grant` may remain as an internal/service-role-only RPC, or be replaced by a private helper plus Edge Function/API use. The security contract is the invariant: authenticated browser clients must not be able to call a security-definer grant lookup for arbitrary users.
  - `classes.schedule_id` exists today without a foreign key. The follow-up must preserve generated class history while adding integrity for future writes.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Exact membership helper shape after revoking direct authenticated RPC access | Reconciliation | `01-security-rls-membership-visibility.md` | Implementation steps in owning chunk | The product decision is settled; the chunk chooses private helper vs service-only public RPC details. |
| How to handle any existing classes with invalid generated-source metadata before adding FK/check constraints | Data integrity risk | `04-generated-class-source-integrity.md` | Implementation steps in owning chunk | The chunk must query for invalid schedule references, template/product mismatches, schedule/template mismatches, and source-field consistency violations before choosing fail-fast cleanup instructions or safe nulling/update migration. |
| Whether final smoke tests use destructive `supabase db reset` | Verification risk | `05-verification-and-docs-hardening.md` | Implementation steps in owning chunk | Default should be non-destructive unless user approves reset. |

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`plans/01-security-rls-membership-visibility.md`](plans/01-security-rls-membership-visibility.md) | Close the critical RLS bypass and member-only visibility leaks: restrict active membership lookup privileges, add safe membership visibility helpers, fix `classes` Edge Function listing, and harden `classes` RLS so non-members cannot directly select member-only classes. | None | `02-membership-ledger-cancellation-audit.md`, final verification | Written |
| [`plans/02-membership-ledger-cancellation-audit.md`](plans/02-membership-ledger-cancellation-audit.md) | Make membership cancellation audit complete for all membership modes: user cancellation, manager registration cancellation, and class cancellation restoration must write ledger rows for every membership-backed registration, with stock deltas only when stock changes. | `01-security-rls-membership-visibility.md` | final verification | Written |
| [`plans/03-product-manager-promotion-boundary.md`](plans/03-product-manager-promotion-boundary.md) | Restrict product-manager promotion to existing active Product Users while preserving Platform Admin first-manager/bootstrap authority. | None | final verification | Written |
| [`plans/04-generated-class-source-integrity.md`](plans/04-generated-class-source-integrity.md) | Add generated-class source integrity: validate existing data, add product-matched template/schedule foreign-key protection, and prevent ordinary class CRUD from forging generated source fields. | None | final verification | Written |
| [`plans/05-verification-and-docs-hardening.md`](plans/05-verification-and-docs-hardening.md) | Add/update follow-up verification docs and smoke checks for the security, RLS, ledger, promotion, and generated-source fixes. | `01-security-rls-membership-visibility.md`, `02-membership-ledger-cancellation-audit.md`, `03-product-manager-promotion-boundary.md`, `04-generated-class-source-integrity.md` | execution handoff / review closeout | Written |

Boundary notes:

- Chunk 01 is security/RLS focused because the direct membership lookup and `members_only` class leak both affect read authorization and membership-aware visibility.
- Chunk 02 is separated because ledger correctness is transactional/audit behavior, not read authorization.
- Chunk 03 is separated because role-management flow has different callers and acceptance cases from membership/class visibility.
- Chunk 04 is separated because generated class source integrity is schema/data-integrity work around schedules and class CRUD.
- Chunk 05 is separated so docs and final smoke coverage can reflect the completed contracts without mixing verification wording into schema/API changes.

## Dependency Order

1. `01-security-rls-membership-visibility.md`
2. `02-membership-ledger-cancellation-audit.md`
3. `03-product-manager-promotion-boundary.md`
4. `04-generated-class-source-integrity.md`
5. `05-verification-and-docs-hardening.md`

Potential parallelism after roadmap approval:

- `03-product-manager-promotion-boundary.md` can run in parallel with `01-security-rls-membership-visibility.md`.
- `04-generated-class-source-integrity.md` can run in parallel with chunks 01-03, provided it begins with a local data-integrity preflight query.
- `02-membership-ledger-cancellation-audit.md` should run after chunk 01 if chunk 01 changes the active membership helper that registration code may call.
- `05-verification-and-docs-hardening.md` must run last.

## Shared Contracts

- Frontend product code calls Edge Functions only. No new `supabase.from()` or `supabase.rpc()` calls should be added under `src/`.
- Direct authenticated database/RPC access is not the product API. If a browser needs data, expose it through an Edge Function that validates product key, origin, JWT, role, and request shape.
- Active membership lookup must not let an authenticated caller inspect another user's membership grant by supplying arbitrary UUIDs.
- `members_only` class visibility means non-members should not see that class as a registrable list/detail item through the Edge API or direct RLS-protected table access.
- Membership Ledger records all membership-backed registration and cancellation actions. Stock-backed events carry signed stock deltas; non-stock events use `stock_delta = 0`.
- Manager promotion by a product manager means promoting an existing active Product User in the same Product. Platform Admin flows remain responsible for first-manager/bootstrap assignment.
- Generated classes keep source references to template/schedule and must not point at a schedule from another product or a nonexistent schedule.
- Existing generated classes remain snapshots and must not be rewritten as part of integrity fixes except for narrowly scoped cleanup of invalid source metadata discovered by preflight.

## Spec Coverage Map

| Spec Requirement / Review Finding | Covered By | Notes |
| --- | --- | --- |
| Frontends call Edge Functions only; RLS is defense in depth | `01-security-rls-membership-visibility.md`, `05-verification-and-docs-hardening.md` | Includes direct RPC privilege regression for `get_active_membership_grant`. |
| RLS prevents cross-product and cross-user data access | `01-security-rls-membership-visibility.md` | Direct authenticated callers must not bypass `membership_grants` RLS through a security-definer function. |
| `visibility` controls whether a class appears as registrable to non-members | `01-security-rls-membership-visibility.md` | Fix Edge Function listing and table RLS. |
| Membership Ledger records every membership-backed action | `02-membership-ledger-cancellation-audit.md` | Covers user cancellation, manager cancellation, and class cancellation restoration for stock and non-stock modes. |
| Managers can promote other Product Users within the same Product | `03-product-manager-promotion-boundary.md` | Restricts manager promotion target to existing active product users. |
| Platform Admin can assign/promote managers for bootstrap | `03-product-manager-promotion-boundary.md` | Must preserve `admin-promote-manager` authority. |
| Generated classes reference source template and schedule | `04-generated-class-source-integrity.md` | Adds data integrity around `classes.template_id`, `classes.schedule_id`, and source fields. |
| Schedule/template/class data remains product-scoped | `04-generated-class-source-integrity.md` | Product-matched FK and API validation prevent cross-product source metadata. |
| Local verification path exists and tracks security regressions | `05-verification-and-docs-hardening.md` | Updates docs with focused security/data-integrity smoke checks. |

## Verification Strategy

Repo-native validation should be layered:

- Static/frontend:
  - `npm run lint`
  - `npm run build`
- Supabase state:
  - `rtk supabase status`
  - `rtk supabase migration list --local`
  - `rtk supabase db lint`
- SQL/security smoke checks:
  - prove `authenticated` cannot execute arbitrary active-membership lookup after chunk 01
  - prove a direct authenticated table/RPC path cannot reveal another user's active membership grant
  - prove a non-member cannot list/select `members_only` classes while a member can
  - prove manager promotion fails for a user without an existing active `product_users` row, while platform-admin promotion still works
  - prove generated classes cannot reference a schedule from another product or nonexistent schedule
  - prove cancellation ledger rows are written for stock and non-stock membership-backed registrations
- Edge Function smoke checks:
  - `classes` `list_user`
  - `register-class` cancellation
  - `manage-registrations` cancellation
  - `classes` cancellation with registration restoration
  - `manager-promote-manager`
  - `admin-promote-manager`
- Docs:
  - `docs/2026-06-06-class-management-product/local-verification.md`
  - `README.md` only if command flow changes

`supabase db reset` remains optional/destructive. Chunk plans should prefer non-destructive queries first and call out when a reset is required for a clean regression.

## Risks And Sequencing Notes

- Security fixes should be first because the current active membership RPC is directly executable by `authenticated`.
- Tightening RLS may break Edge Functions if they accidentally depend on authenticated client permissions instead of service-role server access. Chunk 01 must verify Edge Functions still work.
- Member-only visibility should be enforced twice: Edge Function response correctness and RLS defense in depth.
- Ledger fixes touch transactional registration/cancellation paths. Chunk 02 must verify stock restoration is not double-counted.
- Promotion fixes must not block platform-admin first-manager bootstrap, otherwise a new product can become unmanageable.
- Adding generated-source FK/check constraints can fail if local data already has invalid source references. Chunk 04 owns preflight and cleanup strategy before adding constraints.
- There is no dedicated automated test runner. The chunk plans should use exact SQL and Edge Function smoke checks plus `npm run lint` and `npm run build`.

## Execution Handoff

Recommended next skill after roadmap approval and chunk-plan generation: `$pmp-executing-plans`.

Execution should load:

- `docs/2026-06-06-class-management-product/followups/2026-06-08-implementation-review-fixes/plan.md`
- selected chunk plan files under `docs/2026-06-06-class-management-product/followups/2026-06-08-implementation-review-fixes/plans/`
- `docs/2026-06-06-class-management-product/reviews/2026-06-08/implementation-review.md`
- `docs/2026-06-06-class-management-product/spec.md`
- `docs/2026-06-06-class-management-product/agenda.md`
- `docs/2026-06-06-class-management-product/plan.md`
- relevant original chunk plans under `docs/2026-06-06-class-management-product/plans/`
- `docs/2026-06-06-schedule-system/spec.md`
- `docs/2026-06-06-schedule-system/agenda.md`
- `CONTEXT.md`
- `docs/adr/0001-shared-supabase-product-scoping.md`
- `docs/adr/0002-rolling-schedule-materialization.md`

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing dependencies, or user-requested changes.

## User Approval

Chunk plan files are written. Before `$pmp-executing-plans`, run the required external full plan-set audit and refine this plan set until the auditor returns `Ready for Development`.
