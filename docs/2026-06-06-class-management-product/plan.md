# Class Management Product Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` updated and available
**ADRs:** `../adr/0001-shared-supabase-product-scoping.md`, `../adr/0002-rolling-schedule-materialization.md`
**Status:** Chunk Plans Written

## Goal

Implement the multi-tenant class-management product against one shared Supabase backend while using this Eden website as the first playground implementation. The plan set covers product-scoped identity/roles, Edge-Function-only API access, class templates, rolling schedules, concrete classes, memberships, registration with membership interaction, attendance, and the frontend shell needed to exercise the product.

## Source Artifacts

- Root spec: `docs/2026-06-06-class-management-product/spec.md`
- Root agenda: `docs/2026-06-06-class-management-product/agenda.md`
- Schedule child spec: `docs/2026-06-06-schedule-system/spec.md`
- Schedule child agenda: `docs/2026-06-06-schedule-system/agenda.md`
- Glossary/context: `CONTEXT.md`
- ADR 0001: `docs/adr/0001-shared-supabase-product-scoping.md`
- ADR 0002: `docs/adr/0002-rolling-schedule-materialization.md`

Code paths inspected:

- `package.json`
- `supabase/config.toml`
- `supabase/migrations/20260523082247_create_lesson_signups.sql`
- `src/lib/supabase.ts`
- `src/App.tsx`
- `src/components/**`
- `src/data/site.ts`
- `src/i18n.ts`
- `vite.config.ts`
- `tsconfig.app.json`
- `README.md`

Test / validation commands discovered:

- `npm run lint`
- `npm run build`
- `rtk supabase status`
- `supabase --version` -> `2.105.0`
- `supabase --help`
- `supabase db --help`
- `supabase migration --help`
- `supabase functions --help`

Current local runtime note:

- During initial roadmap creation, `rtk supabase status` reported `No such container: supabase_db_eden_website`. A later external audit observed the local Supabase stack running, with some optional services stopped. Treat runtime state as volatile: every Supabase-dependent chunk plan must begin by checking `rtk supabase status` and starting the stack when needed.

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: None.
- Open agenda questions or risks:
  - Root agenda is complete. Its previous non-blocking schedule risk is resolved by the approved schedule child spec.
  - Schedule agenda is complete. Remaining notes are implementation risks, not product decisions. Ownership is assigned below: horizon-extension trigger and generated-class idempotency belong to `05-schedule-generation-engine.md`; manager schedule-cancellation UI belongs to `11-frontend-manager-class-operations.md`.
  - Membership ledger event names remain to be concretized in `06-membership-ledger.md` and used by `07-registration-engine.md`; this does not change chunk boundaries because the ledger requirement is settled.
- Spec / agenda / context / ADR consistency: Pass.
  - `CONTEXT.md` includes product, product key, product user, manager, user, member, membership ledger, class template, schedule, generation horizon, class, class override, participant, attendance, walk-in, and trial.
  - ADR 0001 matches the shared Supabase product-scoping model.
  - ADR 0002 matches the schedule child spec's rolling materialization model.
- Parent / child spec consistency: Pass.
  - Root spec delegates detailed schedule generation to the schedule child spec.
  - Schedule child spec owns rolling generation, generation horizon, recurrence, timezone, generated class snapshots, and schedule status.
- Accepted planning reconciliations:
  - Treat `class_occurrences` from the root candidate table list as reconciled to the concrete table name `classes`. The domain term remains **Class**.
  - Treat the existing `lesson_signups` migration and README references as legacy landing-page context, not product contract.
- Blockers: None.

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`plans/01-product-role-foundation.md`](plans/01-product-role-foundation.md) | Create the product boundary: products, allowed origins, profiles/product users, platform admin checks, role invariants, RLS helpers, and local seed/bootstrap shape. | None | `02-edge-api-foundation.md`, all product-scoped domain chunks | Written |
| [`plans/02-edge-api-foundation.md`](plans/02-edge-api-foundation.md) | Establish the Edge Function API shell: shared request validation, origin/product resolution, JWT/user loading, role checks, error format, CORS, and first product/user/admin-manager flows. | `01-product-role-foundation.md` | All frontend-facing product APIs | Written |
| [`plans/03-template-class-core.md`](plans/03-template-class-core.md) | Implement class template and concrete class core schema/API: template schemas/defaults, final class table/API naming, global class fields, publication/lifecycle/visibility/policy fields, manager CRUD, and public/user class listing against concrete classes. | `01-product-role-foundation.md`, `02-edge-api-foundation.md` | `04-schedule-rule-model.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md`, `08-attendance-engine.md` | Written |
| [`plans/04-schedule-rule-model.md`](plans/04-schedule-rule-model.md) | Implement schedule records and recurrence preview: read-only template selection, draft/active/paused/archived status, one-time/weekly recurrence fields, IANA timezone storage, skip-date records, and manager schedule CRUD/preview APIs without class materialization. | `03-template-class-core.md` | `05-schedule-generation-engine.md`, manager schedule UI | Written |
| [`plans/05-schedule-generation-engine.md`](plans/05-schedule-generation-engine.md) | Implement rolling class materialization: product-level 8-week Generation Horizon, horizon-extension trigger, idempotency constraints, absolute timestamp generation, published generated-class defaults, snapshot behavior, and generated class/source references. | `04-schedule-rule-model.md` | User-visible recurring class calendar, registration against generated classes | Written |
| [`plans/06-membership-ledger.md`](plans/06-membership-ledger.md) | Implement membership types, grants, one-active-grant invariant, upgrade replacement, active membership lookup, finalized ledger event names, and membership ledger event recording for all membership-backed actions. | `01-product-role-foundation.md`, `02-edge-api-foundation.md` | `07-registration-engine.md`, manager membership UI | Written |
| [`plans/07-registration-engine.md`](plans/07-registration-engine.md) | Implement atomic registration/cancellation/approval behavior: class eligibility, capacity locking, membership requirement/policy interaction, stock consumption/restoration, ledger events, and manager approval APIs. | `03-template-class-core.md`, `05-schedule-generation-engine.md`, `06-membership-ledger.md` | `08-attendance-engine.md`, user registration UI | Written |
| [`plans/08-attendance-engine.md`](plans/08-attendance-engine.md) | Implement class start/completion and participation records: registered participants, walk-ins, trials, attendance status, lifecycle transitions, and post-start registration cutoff enforcement. | `07-registration-engine.md` | Manager attendance workflow and class history | Written |
| [`plans/09-frontend-product-auth-shell.md`](plans/09-frontend-product-auth-shell.md) | Build the playground product/auth shell: product context resolution, session state, role-aware navigation, Edge Function client wrapper, error/loading states, and protected manager/user routes without domain workflows. | `02-edge-api-foundation.md` | All frontend workflow chunks | Written |
| [`plans/10-frontend-user-classes-registration.md`](plans/10-frontend-user-classes-registration.md) | Build user-facing class discovery and registration: public/member-aware class listing, class details, registration request/cancel flows, pending/approved status display, and membership-aware messaging. | `09-frontend-product-auth-shell.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md` | End-to-end user workflow validation | Written |
| [`plans/11-frontend-manager-class-operations.md`](plans/11-frontend-manager-class-operations.md) | Build manager class operations: template editor, schedule editor/preview/activation, generated class inspection, per-class edits/cancellation, explicit schedule-cancellation choices, and pending registration approval queue. | `09-frontend-product-auth-shell.md`, `03-template-class-core.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md` | Manager schedule/class workflow validation | Written |
| [`plans/12-frontend-manager-membership-attendance.md`](plans/12-frontend-manager-membership-attendance.md) | Build manager membership and attendance workflows: membership type/grant management, user membership upgrade/revoke views, class start/completion, registered attendance, walk-ins, and trials. | `09-frontend-product-auth-shell.md`, `06-membership-ledger.md`, `08-attendance-engine.md` | Manager membership/attendance validation | Written |
| [`plans/13-local-verification-and-docs.md`](plans/13-local-verification-and-docs.md) | Consolidate local seeds, smoke scripts or documented commands, README/env updates, Supabase reset/function validation, and final cross-chunk regression checks. | `01-product-role-foundation.md` through `12-frontend-manager-membership-attendance.md` | Reliable handoff to execution and future products | Written |

## Dependency Order

1. `01-product-role-foundation.md`
2. `02-edge-api-foundation.md`
3. `03-template-class-core.md`
4. `04-schedule-rule-model.md`
5. `05-schedule-generation-engine.md`
6. `06-membership-ledger.md`
7. `07-registration-engine.md`
8. `08-attendance-engine.md`
9. `09-frontend-product-auth-shell.md`
10. `10-frontend-user-classes-registration.md`
11. `11-frontend-manager-class-operations.md`
12. `12-frontend-manager-membership-attendance.md`
13. `13-local-verification-and-docs.md`

Potential parallelism after roadmap approval:

- `04-schedule-rule-model.md` and `06-membership-ledger.md` can be planned/executed independently after `03-template-class-core.md` and `02-edge-api-foundation.md` are stable.
- `10-frontend-user-classes-registration.md`, `11-frontend-manager-class-operations.md`, and `12-frontend-manager-membership-attendance.md` can be planned in parallel after `09-frontend-product-auth-shell.md`, but execution still depends on their backend chunks.

## Shared Contracts

- Canonical execution choices:
  - Concrete class table name is `classes`. Do not use `class_occurrences`.
  - Schedule duration is stored as `duration_minutes integer`, not `end_time`.
  - Generated class source fields are `template_id`, `schedule_id`, `generated_for_date`, and `source_timezone`.
  - Participant kind values are `registered`, `walk_in`, and `trial`.
  - API responses use `{ "data": <value>, "error": null }` on success and `{ "data": null, "error": { "code": "...", "message": "..." } }` on failure.
- Product boundary:
  - `products.product_key` is public scope, not a secret.
  - Every product-domain table carries `product_id`.
  - `product_allowed_origins` binds origins/domains to products, including localhost development origins.
- User/role model:
  - Supabase Auth identity is global.
  - `product_users(product_id, user_id)` is the product access row.
  - Product role values are `manager` and `user`; platform admin is separate operator authority.
- API boundary:
  - Frontend calls Edge Functions only.
  - Edge Functions validate product key, origin, JWT, role, and request shape before database mutation.
  - Transactional Postgres functions may sit behind Edge Functions for capacity, generation, membership, and registration decisions.
- Class model:
  - Users register for concrete Classes only.
  - Class publication status: `draft`, `published`.
  - Class lifecycle status: `created`, `cancelled`, `in_progress`, `completed`.
  - Class visibility: `public`, `hidden`, `members_only`.
  - Registration policy: `auto_approve`, `member_auto_approve`, `approval_required`.
  - Membership requirement: `none`, `required`.
- Template model:
  - Templates define typed custom fields and reusable defaults.
  - Schedules select templates read-only and cannot override class defaults.
- Schedule model:
  - Schedule status: `draft`, `active`, `paused`, `archived`.
  - Product-level Generation Horizon defaults to 8 weeks.
  - Active schedules generate published concrete class rows by default.
  - Generated classes are snapshots, not live projections.
  - Recurrence uses local wall-clock terms with IANA timezone; generated classes store absolute timestamps plus source timezone.
- Membership model:
  - Modes: `stock`, `limited_stock`, `limited`, `infinite`.
  - One active membership grant per product user in v1.
  - Upgrade replaces/closes the prior active grant.
  - Membership Ledger records membership-backed actions for all membership modes; stock events carry deltas.
- Participation model:
  - Registration status: `pending`, `approved`, `rejected`, `cancelled`.
  - Attendance status: `present`, `absent`.
  - Participant kinds distinguish registered users, walk-ins, and trials.

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| One shared Supabase backend with product-key scoping | `01-product-role-foundation.md`, `02-edge-api-foundation.md` | ADR 0001 governs table/API boundary. |
| Product-scoped manager/user roles and platform admin bootstrap | `01-product-role-foundation.md`, `02-edge-api-foundation.md` | Includes origin-bound product association and manager promotion. |
| Edge Functions as only frontend API | `02-edge-api-foundation.md`, all API chunks | Direct table/RPC access is not a frontend contract. |
| Class templates with typed custom fields and defaults | `03-template-class-core.md` | Schedule reads template defaults but does not override them. |
| Concrete class global fields and lifecycle/visibility/policy state | `03-template-class-core.md` | Required before schedules and registration. |
| Schedule records, statuses, recurrence rules, timezone storage, preview, skipped dates | `04-schedule-rule-model.md` | No class materialization in this chunk. |
| Rolling schedule generation from templates | `05-schedule-generation-engine.md` | ADR 0002 governs materialization. |
| Product-level 8-week Generation Horizon | `05-schedule-generation-engine.md` | Horizon extension trigger and idempotency constraints owned here. |
| Membership types, grants, one-active-grant invariant, upgrades | `06-membership-ledger.md` | Selling/payment is out of scope. |
| Membership Ledger for all membership-backed actions | `06-membership-ledger.md`, `07-registration-engine.md` | Event names finalized in `06-membership-ledger.md` and consumed in `07-registration-engine.md`. |
| Registration policy and membership interaction | `07-registration-engine.md` | Includes capacity, pending/approved behavior, stock consumption/restoration. |
| Attendance, walk-ins, trials, class start/completion | `08-attendance-engine.md` | Registration closes at `starts_at` and when class starts. |
| Product/auth frontend shell | `09-frontend-product-auth-shell.md` | Shared frontend contract for user and manager workflows. |
| User class discovery and registration UI | `10-frontend-user-classes-registration.md` | User-facing workflow only. |
| Manager template/schedule/class UI | `11-frontend-manager-class-operations.md` | Owns manager schedule-cancellation choice UI. |
| Manager membership and attendance UI | `12-frontend-manager-membership-attendance.md` | Manager-facing membership and attendance workflows. |
| Local verification and reusable handoff | `13-local-verification-and-docs.md` | Consolidates env docs, smoke checks, and reset/build validation. |

## Verification Strategy

Repo-native validation will use:

- `npm run lint` for TypeScript/React linting.
- `npm run build` for TypeScript build and Vite production build.
- `rtk supabase status` before Supabase-dependent chunks; if stopped, execution should run `rtk supabase start` or explicitly ask the user to start it.
- `supabase db reset` / `supabase migration list` / `supabase db lint` where appropriate after migration chunks, discovered under `supabase db --help` and `supabase migration --help`.
- `supabase functions serve` for local Edge Function smoke validation, discovered under `supabase functions --help`.
- SQL/RPC smoke tests for product boundary, RLS, generation idempotency, registration capacity, membership stock, and attendance transitions.

The repo has no dedicated frontend test runner today. Chunk plans should use focused SQL/Edge Function smoke checks plus `npm run lint` and `npm run build`, unless the user asks to add a test runner.

## Risks And Sequencing Notes

- Supabase runtime state changed during roadmap/audit. Every DB/API chunk must verify `rtk supabase status` at execution time and start the stack if needed.
- The existing `lesson_signups` migration remains legacy landing-page state. Implementation should not extend it into the new product model.
- Schema chunks should use Supabase migration creation flow during execution, not handwritten timestamp guesses.
- RLS and grants must be explicit because `public` and `graphql_public` are exposed schemas in `supabase/config.toml`.
- Edge Function chunks must avoid browser exposure of service-role keys.
- Schedule generation idempotency and timezone behavior are high-risk; `05-schedule-generation-engine.md` owns idempotency constraints, horizon extension, and SQL/RPC tests before frontend integration.
- Membership registration is concurrency-sensitive; stock/capacity operations must be transactional.
- Frontend work is split by shell, user workflow, manager class operations, and manager membership/attendance workflows before roadmap approval.

## Execution Handoff

Status: chunk plans are written but require external audit approval before execution. After the full plan-set audit returns `Ready for Development`, use `$test-executing-plans` with selected chunk files.

Execution preflight should load:

- `docs/2026-06-06-class-management-product/plan.md`
- selected files under `docs/2026-06-06-class-management-product/plans/`
- `docs/2026-06-06-class-management-product/spec.md`
- `docs/2026-06-06-class-management-product/agenda.md`
- `docs/2026-06-06-schedule-system/spec.md`
- `docs/2026-06-06-schedule-system/agenda.md`
- `CONTEXT.md`
- `docs/adr/0001-shared-supabase-product-scoping.md`
- `docs/adr/0002-rolling-schedule-materialization.md`

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing dependencies, or user-requested changes.

## User Review

Chunk plan files are written. Review the plan set, request changes to selected chunks, or move toward execution with `$test-executing-plans`.
