# Registration Cancellation Cutoff Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` updated with Cancellation Cutoff
**ADRs:** None
**Status:** Chunk Plans Written

## Goal

Implement a product-level N-hour cutoff for user-driven class registration cancellation. The default is 24 hours before `classes.starts_at`; after the cutoff, the backend rejects user cancellation and the reusable React UI disables or replaces the cancel action with clear messaging.

## Source Artifacts

- Spec: `docs/2026-06-09-registration-cancellation-cutoff/spec.md`
- Agenda: `docs/2026-06-09-registration-cancellation-cutoff/agenda.md`
- Context: `CONTEXT.md`
- Parent class-management spec: `docs/2026-06-06-class-management-product/spec.md`
- Extraction spec/handoff: `docs/2026-06-08-class-management-extraction/spec.md`, `docs/2026-06-08-class-management-extraction/handoff.md`
- Related current plan set: `docs/2026-06-09-registration-rejection-recovery/spec.md`, used only to avoid overlapping rejected-registration recovery scope

Code paths inspected:

- `backend/supabase/migrations/20260607160000_registration_engine.sql`
- `backend/supabase/migrations/20260608020000_membership_cancellation_audit.sql`
- `backend/supabase/functions/register-class/index.ts`
- `backend/supabase/functions/classes/index.ts`
- `packages/class-management-react/src/types.ts`
- `packages/class-management-react/src/client/product-api.ts`
- `packages/class-management-react/src/components/user/class-list.tsx`
- `packages/class-management-react/src/components/user/class-detail.tsx`
- `apps/class-management-playground/README.md`
- `backend/package.json`
- `package.json`

Validation commands discovered:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- from `backend/`, `rtk npm run supabase:migrations`
- from `backend/`, `rtk npm run supabase:db-lint`

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: None.
- Open agenda questions or risks: None that change chunk boundaries. The only non-blocking risk is that the UI may need refresh to update exactly at the cutoff boundary; backend enforcement owns correctness.
- Spec / agenda / context / ADR consistency: Pass. `CONTEXT.md` receives the glossary term **Cancellation Cutoff**; no ADR is needed.
- Parent / child spec consistency: Pass. This plan narrows the parent spec's registration lifecycle without adding the deferred per-class `registration_closes_at` feature.
- Accepted planning reconciliations:
  - Current backend allows user cancellation until class start for stock restoration purposes; this plan changes user cancellation permission, not manager/class restoration behavior.
  - The concurrent registration-rejection-recovery plan touches registration lifecycle but does not own cancellation cutoff. If both plans are implemented, the later migration must preserve both function changes.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Preserve both this cutoff migration and any registration-rejection-recovery migration if implemented in parallel | Sequencing Risk | `01-backend-cancellation-cutoff.md` | Implementation steps in owning chunk | Both plans may replace registration functions. Implementer must diff current DB function body before writing the final replacement. |
| UI cutoff state may need refresh at exact boundary | Non-blocking Risk | `02-user-cancellation-cutoff-ui.md` | Verification in owning chunk | Backend correctness is authoritative; UI only needs to prevent normal stale actions after loaded state. |

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`plans/01-backend-cancellation-cutoff.md`](plans/01-backend-cancellation-cutoff.md) | Add product-level cutoff storage, enforce cancellation cutoff in `cancel_class_registration`, map the backend error, and expose server-computed cancellation availability from class listing. | None | `02-user-cancellation-cutoff-ui.md` | Written |
| [`plans/02-user-cancellation-cutoff-ui.md`](plans/02-user-cancellation-cutoff-ui.md) | Update package types and user workflow UI so cancellation is disabled/replaced after cutoff with clear messaging; update playground smoke notes and run static validation. | `01-backend-cancellation-cutoff.md` | End-to-end user cancellation cutoff validation | Written |

## Dependency Order

1. `01-backend-cancellation-cutoff.md`
2. `02-user-cancellation-cutoff-ui.md`

No parallel execution is recommended because the UI depends on the backend payload fields and error code.

## Shared Contracts

- Product setting: `products.registration_cancellation_cutoff_hours integer not null default 24`.
- Cutoff rule: user cancellation is allowed only when `now() < classes.starts_at - make_interval(hours => registration_cancellation_cutoff_hours)`.
- Backend error: `registration_cancellation_closed`.
- API error mapping: `400 bad_request` with cancellation-closed message.
- Class summary fields:
  - `registration_cancellation_cutoff_hours: number`
  - `can_cancel_registration: boolean`
- UI invariant: pending/approved registration status remains visible after cutoff; normal user cancel action is not clickable after cutoff.
- User cancel action continues to call `register-class` with `p_force_restore = false`.
- Manager cancellation/class cancellation restoration behavior remains unchanged.

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| Default 24-hour N-hour cutoff | `plans/01-backend-cancellation-cutoff.md` | Product-level column default. |
| Cutoff value 0 preserves old until-start behavior | `plans/01-backend-cancellation-cutoff.md` | Covered by SQL condition and smoke. |
| Backend rejects stale/direct user cancellation after cutoff | `plans/01-backend-cancellation-cutoff.md` | Database function enforcement plus Edge Function error mapping. |
| UI disables/replaces cancel action after cutoff | `plans/02-user-cancellation-cutoff-ui.md` | Uses server-computed `can_cancel_registration`. |
| Registration status stays visible after cutoff | `plans/02-user-cancellation-cutoff-ui.md` | `ClassDetail` still renders `RegistrationStatus`. |
| Manager cancellation remains unchanged | `plans/01-backend-cancellation-cutoff.md` | Smoke plan includes manager/class cancellation check. |
| Existing registration and membership ledger behavior preserved | `plans/01-backend-cancellation-cutoff.md` | Function replacement must preserve cancellation ledger calls. |

## Verification Strategy

Backend chunk verification:

- `rtk npm run supabase:migrations` from `backend/`
- `rtk npm run supabase:db-lint` from `backend/` when the local Supabase stack is available
- SQL smoke for allowed cancellation, cutoff-blocked cancellation, and unchanged manager/class cancellation behavior

Frontend/package chunk verification:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- Manual playground smoke for before-cutoff and after-cutoff user registration rows

If Supabase CLI or local stack is unavailable, implementation should record verification as an environment blocker instead of weakening the plan.

## Risks And Sequencing Notes

- The registration-rejection-recovery plan also replaces registration functions. If that plan is implemented first, this cutoff migration must start from the newer function body rather than copying the older cancellation-audit function.
- Avoid broad product-policy refactors. Do not add per-class cancellation deadline fields in this task.
- Do not touch Eden website landing-page copy or legacy `src/i18n.ts` unless the extracted package is reintegrated later. The active cancellation UI is in `packages/class-management-react`.
- Use server/database time as the source of truth. Browser time may be wrong.

## Execution Handoff

Recommended next skill: `$pmp-executing-plans`.

Execution should load:

- `docs/2026-06-09-registration-cancellation-cutoff/plan.md`
- `docs/2026-06-09-registration-cancellation-cutoff/plans/01-backend-cancellation-cutoff.md`
- `docs/2026-06-09-registration-cancellation-cutoff/plans/02-user-cancellation-cutoff-ui.md`
- `docs/2026-06-09-registration-cancellation-cutoff/spec.md`
- `docs/2026-06-09-registration-cancellation-cutoff/agenda.md`
- `CONTEXT.md`

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing dependencies, or a function-body conflict with another already-applied registration migration.

## User Approval

Roadmap approval is simulated by the non-interactive planner phase. Chunk plans are written and ready for external audit.
