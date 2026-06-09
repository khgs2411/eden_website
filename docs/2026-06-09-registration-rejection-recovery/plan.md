# Registration Rejection Recovery Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` updated with Registration Rejection Recovery
**ADRs:** None
**Status:** Chunk Plans Written

## Goal

Implement rejected class-registration recovery so a manager can approve a rejected registration or explicitly allow the user to re-register, while preserving rejected registration history and preventing duplicate live registrations.

## Source Artifacts

- Spec: `docs/2026-06-09-registration-rejection-recovery/spec.md`
- Agenda: `docs/2026-06-09-registration-rejection-recovery/agenda.md`
- Context: `CONTEXT.md`
- Existing product spec: `docs/2026-06-06-class-management-product/spec.md`
- Existing plan set: `docs/2026-06-06-class-management-product/plan.md`
- Backend docs: `backend/README.md`, `backend/SMOKE.md`
- Playground docs: `apps/class-management-playground/README.md`

Code paths inspected:

- `backend/supabase/migrations/20260607160000_registration_engine.sql`
- `backend/supabase/migrations/20260608020000_membership_cancellation_audit.sql`
- `backend/supabase/functions/manage-registrations/index.ts`
- `backend/supabase/functions/register-class/index.ts`
- `backend/supabase/functions/classes/index.ts`
- `packages/class-management-react/src/manager/manager-api.ts`
- `packages/class-management-react/src/client/product-api.ts`
- `packages/class-management-react/src/components/manager/pending-registrations.tsx`
- `packages/class-management-react/src/components/manager/manager-class-dashboard.tsx`
- `packages/class-management-react/src/components/user/class-list.tsx`
- `packages/class-management-react/src/components/user/class-detail.tsx`
- `packages/class-management-react/src/types.ts`
- `package.json`
- `backend/package.json`

Test / validation commands discovered:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- from `backend/`: `rtk npm run supabase:migrations`, `rtk npm run supabase:db-lint`, `rtk npm run supabase:functions`

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: Supabase skill source path was unavailable in this worker cache; planning continued from repository Supabase docs and code. No product decision depends on the missing skill file.
- Open agenda questions or risks: No open material questions. Two non-blocking risks are assigned below.
- Spec / agenda / context / ADR consistency: Pass. `CONTEXT.md` now defines Registration Rejection Recovery consistently with the spec and agenda.
- Parent / child spec consistency: Pass. This feature extends the existing class registration lifecycle without changing product scoping, membership, schedule, or attendance decisions.
- Accepted planning reconciliations:
  - The task wording says "rejected user"; code evidence supports rejected class registration as the only existing rejection lifecycle.
  - `allow_reregister` is a backend-confirmed recovery affordance because rejected rows are already non-live in the database.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Rejected rows are currently already non-live, so `allow_reregister` should not change registration status | Non-blocking Risk | `01-backend-registration-recovery.md` | Implementation steps in owning chunk | Backend action must validate status, set recovery metadata, and keep the row rejected. |
| Manager UI may initially show user ids rather than names/emails | Non-blocking Risk | `02-manager-recovery-ui.md` | Implementation steps in owning chunk | Match existing pending queue; do not add profile/email joins unless needed for this task. |

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`plans/01-backend-registration-recovery.md`](plans/01-backend-registration-recovery.md) | Add backend recovery actions for rejected registrations and preserve live-registration invariants. | None | `02-manager-recovery-ui.md` | Written |
| [`plans/02-manager-recovery-ui.md`](plans/02-manager-recovery-ui.md) | Add manager UI/API types for rejected-registration recovery and verify package/playground builds. | `01-backend-registration-recovery.md` | End-to-end manager recovery smoke | Written |

## Dependency Order

1. `plans/01-backend-registration-recovery.md`
2. `plans/02-manager-recovery-ui.md`

No parallel execution is recommended because the frontend action names and response behavior depend on the backend contract.

## Shared Contracts

- Edge Function: `manage-registrations`
- New manager actions: `approve_rejected`, `allow_reregister`
- Existing manager actions unchanged: `list_pending`, `list_class`, `approve`, `reject`, `cancel`
- Registration status values unchanged: `pending`, `approved`, `rejected`, `cancelled`
- Recovery metadata fields: `rejected_at`, `rejected_by`, `rejection_recovered_at`, `rejection_recovered_by`, `rejection_recovery_action`
- Success wrapper unchanged: `{ data: <value>, error: null }`
- Error wrapper unchanged: `{ data: null, error: { code, message } }`
- Live registration invariant: at most one `pending` or `approved` row for `(class_id, user_id)`

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| Manager can approve rejected registration | `plans/01-backend-registration-recovery.md`, `plans/02-manager-recovery-ui.md` | Backend owns invariant checks; UI exposes the action. |
| Manager can allow user to re-register | `plans/01-backend-registration-recovery.md`, `plans/02-manager-recovery-ui.md` | Keeps rejected row historical and non-live while recording recovery metadata. |
| User can submit fresh registration after rejection | `plans/01-backend-registration-recovery.md` | Existing user class list already ignores rejected rows; backend smoke should prove it. |
| Old rejected approval conflicts when live replacement exists | `plans/01-backend-registration-recovery.md` | Required before approving a rejected row. |
| Manager-only product-scoped recovery | `plans/01-backend-registration-recovery.md` | Existing Edge Function `requireProductManager` remains authoritative. |
| Existing pending behavior remains unchanged | Both chunks | New actions are additive. |

## Verification Strategy

Planning verification:

- Read local instructions and planning-skill reference formats.
- Inspect current registration SQL, Edge Functions, manager components, user registration components, package scripts, and backend docs.
- Run `git status --short` before edits and `git diff --check` after edits.

Implementation verification:

- `rtk npm run build:package` expects TypeScript package build success.
- `rtk npm run build:playground` expects playground build success.
- `rtk npm run lint` expects ESLint success.
- `rtk npm run build` expects repo TypeScript/Vite build success.
- From `backend/`, `rtk npm run supabase:migrations` expects the new migration to be visible.
- When Supabase CLI/stack is available, run SQL or Edge Function smoke for rejected approval, allow re-register, and duplicate-live conflict.

## Risks And Sequencing Notes

- Do not change `class_registrations_one_live_idx`; it already encodes the desired re-registration behavior.
- Do not use `cancelled` to represent allow-re-register recovery; keep rejected status and use recovery metadata.
- Do not change user class listing to return rejected rows; that would disable the existing Register button because `ClassDetail` disables registration when any `user_registration` exists.
- Do not add product-user rejection state; that is outside the current schema and task scope.
- Backend changes need runtime-aware verification because the root frontend build does not typecheck Supabase Edge Functions.

## Execution Handoff

Recommended next skill: `$pmp-executing-plans`.

Execution should load:

- `docs/2026-06-09-registration-rejection-recovery/plan.md`
- `docs/2026-06-09-registration-rejection-recovery/spec.md`
- `docs/2026-06-09-registration-rejection-recovery/agenda.md`
- selected chunk files under `docs/2026-06-09-registration-rejection-recovery/plans/`
- `CONTEXT.md`

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing Supabase runtime where runtime smoke is required, or unexpected existing behavior that contradicts the spec.

## User Approval

Non-interactive planner phase: the design and roadmap are treated as approved for chunk-plan generation by the task instructions.
