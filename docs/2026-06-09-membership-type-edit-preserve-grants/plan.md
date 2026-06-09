# Membership Type Editing Without Retroactive Grant Changes Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` updated with Membership Type and Membership Grant
**ADRs:** None
**Status:** Chunk Plans Written

## Goal

Implement manager editing for created membership types while preserving the concrete entitlement values already issued to existing membership grants.

## Source Artifacts

- Spec: `docs/2026-06-09-membership-type-edit-preserve-grants/spec.md`
- Agenda: `docs/2026-06-09-membership-type-edit-preserve-grants/agenda.md`
- Context: `CONTEXT.md`
- Parent product spec: `docs/2026-06-06-class-management-product/spec.md`
- Parent membership backend plan: `docs/2026-06-06-class-management-product/plans/06-membership-ledger.md`
- Parent frontend membership plan: `docs/2026-06-06-class-management-product/plans/12-frontend-manager-membership-attendance.md`
- Extraction plan: `docs/2026-06-08-class-management-extraction/plans/09-manager-membership-attendance-workflows.md`
- ADRs: `docs/adr/0001-shared-supabase-product-scoping.md`, `docs/adr/0003-nested-supabase-project-boundary.md`, `docs/adr/0004-local-workspace-frontend-package.md`

Code paths inspected:

- `backend/supabase/functions/memberships/index.ts`
- `backend/supabase/migrations/20260607132920_membership_ledger.sql`
- `packages/class-management-react/src/components/manager/membership-types.tsx`
- `packages/class-management-react/src/components/manager/membership-grants.tsx`
- `packages/class-management-react/src/components/manager/product-users-list.tsx`
- `packages/class-management-react/src/components/manager/manager-operations-dashboard.tsx`
- `packages/class-management-react/src/manager/manager-api.ts`
- `apps/class-management-playground/src/App.tsx`
- `package.json`
- `backend/package.json`

Test / validation commands discovered:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- from `backend/`: `rtk npm run supabase:migrations`, `rtk npm run supabase:db-lint`, `rtk npm run supabase:status`, `rtk npm run supabase:reset`

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: `/Users/liadgoren/.codex/RTK.md` is referenced by `AGENTS.md` but not mounted in this worker. Planning continued from the local `AGENTS.md`, `docs/deployment/development-guideline.md`, loaded skill instructions, and repository code. No product decision depends on that missing host file.
- Open agenda questions or risks: No open material questions. The display-name snapshot issue is a non-blocking risk owned by Chunk 02.
- Spec / agenda / context / ADR consistency: Pass. `CONTEXT.md` now distinguishes Membership Type from Membership Grant, matching the spec.
- Parent / child spec consistency: Pass. This feature does not reopen upgrade carryover; it adds future-only membership type edits.
- Accepted planning reconciliations:
  - The task title's "membership" wording is interpreted as Membership Type because grant editing would change what was already granted.
  - No migration is planned because `membership_grants` already stores entitlement values issued at grant time.
  - Audit refinement resolved `update_type` irrelevant-default semantics: omitted or `null` irrelevant defaults are accepted, but incompatible non-null values are rejected.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Current membership type name may display on old grants after rename | Non-blocking Risk | `02-manager-membership-type-edit-ui.md` | Implementation steps in owning chunk | Keep entitlement values visible and avoid claiming name snapshots exist. |
| Runtime Supabase smoke may be unavailable in worker environments | Non-blocking Risk | `01-backend-update-type-preservation.md` | Verification in owning chunk | Static checks can pass without local-stack smoke, but task output must record skipped smoke separately. |
| Incompatible non-null default fields must be rejected by `update_type` | Reconciliation | `01-backend-update-type-preservation.md` | Implementation steps in owning chunk | Backend owns the authoritative payload contract; frontend should omit irrelevant fields. |

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`plans/01-backend-update-type-preservation.md`](plans/01-backend-update-type-preservation.md) | Harden the `memberships` `update_type` contract and define smoke verification proving existing grants are unchanged. | None | `02-manager-membership-type-edit-ui.md` | Written |
| [`plans/02-manager-membership-type-edit-ui.md`](plans/02-manager-membership-type-edit-ui.md) | Add manager UI to edit membership types through the existing memberships Edge Function and refresh dependent views. | `01-backend-update-type-preservation.md` | End-to-end manager membership type editing | Written |

## Dependency Order

1. `plans/01-backend-update-type-preservation.md`
2. `plans/02-manager-membership-type-edit-ui.md`

No parallel execution is recommended because the frontend should follow the hardened backend validation behavior.

## Shared Contracts

- Edge Function: `memberships`
- Existing action reused: `update_type`
- Editable fields: `name`, `default_stock`, `default_duration_days`
- Immutable field: `mode`
- Membership type modes: `stock`, `limited_stock`, `limited`, `infinite`
- `update_type` payload semantics: supported default fields may be omitted, cleared with `null`, or set to positive integers; unsupported default fields may be omitted or sent as `null`, but unsupported non-null values return `400 bad_request`.
- Existing grant entitlement fields that must not be changed by type edit: `mode`, `valid_from`, `valid_until`, `total_stock`, `remaining_stock`, `status`
- Success wrapper unchanged: `{ data: <value>, error: null }`
- Error wrapper unchanged: `{ data: null, error: { code, message } }`

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| Managers can edit name and mode-appropriate defaults | `plans/01-backend-update-type-preservation.md`, `plans/02-manager-membership-type-edit-ui.md` | Backend owns contract; UI exposes it. |
| Mode remains immutable | `plans/01-backend-update-type-preservation.md`, `plans/02-manager-membership-type-edit-ui.md` | Backend rejects `mode` in update payloads; UI does not send it during edit. |
| Invalid mode/default update payloads are rejected | `plans/01-backend-update-type-preservation.md`, `plans/02-manager-membership-type-edit-ui.md` | Backend rejects incompatible non-null defaults; UI omits irrelevant default fields. |
| Existing grants keep entitlement fields | `plans/01-backend-update-type-preservation.md` | SQL/Edge smoke owns proof. |
| Future grants use edited defaults | `plans/01-backend-update-type-preservation.md`, `plans/02-manager-membership-type-edit-ui.md` | Smoke should create a new grant after edit. |
| Existing grant/upgrade/revoke behavior remains unchanged | Both chunks | Changes are additive around `update_type`. |
| Product scoping and manager-only access remain server-side | `plans/01-backend-update-type-preservation.md` | Existing Edge Function manager guard remains in place. |

## Verification Strategy

Planning verification:

- Read local instructions and referenced development guideline.
- Read loaded brainstorming and writing-plan skill references.
- Inspected current membership SQL, memberships Edge Function, manager membership UI, user membership display, package scripts, backend scripts, context, ADRs, and existing class-management plans.
- Read `.symphony/audits/spec-audit.md` and refined the spec/chunks to remove the invalid-payload contract conflict.
- Ran `git status --short --branch` before edits.

Implementation verification:

- `rtk npm run build:package` expects package TypeScript build success.
- `rtk npm run build:playground` expects playground build success.
- `rtk npm run lint` expects ESLint success.
- `rtk npm run build` expects root TypeScript/Vite build success.
- From `backend/`, `rtk npm run supabase:migrations` expects migrations list success.
- When local Supabase is available, run smoke that edits a type after a grant and asserts existing grant entitlement fields are unchanged while a new grant receives edited defaults.

## Risks And Sequencing Notes

- Do not add `edit_grant`; that changes the product problem and can mutate issued entitlements.
- Do not make `mode` editable; mode edits would make one type id represent incompatible grant semantics.
- Do not add migration just to preserve stock/duration; grant rows already preserve those values.
- Do not claim historical type names are snapshot; they are not in the current schema.
- Do not silently accept incompatible non-null default values in `update_type`; that would violate the backend validation contract.
- Root frontend build does not typecheck Supabase Edge Functions, so backend runtime smoke remains important when the environment supports it.

## Execution Handoff

Recommended next skill: `$pmp-executing-plans`.

Execution should load:

- `docs/2026-06-09-membership-type-edit-preserve-grants/plan.md`
- `docs/2026-06-09-membership-type-edit-preserve-grants/spec.md`
- `docs/2026-06-09-membership-type-edit-preserve-grants/agenda.md`
- selected chunk files under `docs/2026-06-09-membership-type-edit-preserve-grants/plans/`
- `CONTEXT.md`

Execution must stop on unclear plan steps, failed verification, a discovered need for grant editing, missing Supabase runtime for required smoke, or code/spec conflict.

## User Approval

Non-interactive planner phase: the design and roadmap are treated as approved for chunk-plan generation by the task instructions.
