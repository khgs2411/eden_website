# Schedule Generation Count Control Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` read; no update needed
**ADRs:** None
**Status:** Chunk Plans Written

## Goal

Implement manager-controlled schedule generation count by extending the backend generation contract first, then wiring the reusable manager schedule UI to send a validated `generation_count` value through the existing `schedule-generate` Edge Function.

## Source Artifacts

- `docs/2026-06-09-generation-count-control/spec.md`
- `docs/2026-06-09-generation-count-control/agenda.md`
- `CONTEXT.md`
- `docs/2026-06-06-class-management-product/spec.md`
- `docs/2026-06-06-class-management-product/plans/05-schedule-generation-engine.md`
- `docs/2026-06-08-class-management-extraction/spec.md`
- `backend/supabase/migrations/20260607112136_product_role_foundation.sql`
- `backend/supabase/migrations/20260607153000_schedule_generation_engine.sql`
- `backend/supabase/functions/schedule-generate/index.ts`
- `backend/supabase/functions/schedules/index.ts`
- `packages/class-management-react/src/components/manager/schedule-editor.tsx`
- `packages/class-management-react/src/manager/manager-api.ts`
- Verification commands discovered: `rtk npm run build:package`, `rtk npm run build:playground`, `rtk npm run lint`, backend `rtk npm run supabase:reset`, backend `rtk npm run supabase:db-lint`, backend `rtk npm run supabase:functions`

## Design Readiness Check

- Source artifact paths verified: Pass.
- Missing or unavailable artifacts: None.
- Open agenda questions or risks: Non-blocking naming risk for `generation_horizon_weeks`; it does not change chunk boundaries.
- Spec / agenda / context / ADR consistency: Pass. Existing `Generation Horizon` term remains valid; request-level `generation_count` is an API field, not a new glossary term.
- Parent / child spec consistency: Pass. This plan extends the existing schedule-generation design without changing product scoping, Edge Function boundary, or generated-class snapshot behavior.
- Accepted planning reconciliations: The card says "generate count" while existing code says 8-week horizon. Planning reconciles this as occurrence count with default `8`, keeping `generation_horizon_weeks` as the fallback default for compatibility.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Existing `generation_horizon_weeks` name is imperfect for request-level occurrence count. | Non-blocking risk | `01-backend-generation-count-contract.md` | Implementation steps in owning chunk | Keep the column as fallback default; do not rename it in this task. |
| Existing two-argument `generate_schedule_classes(uuid, uuid)` overload can retain stale horizon-week logic. | Contract reconciliation | `01-backend-generation-count-contract.md` | Implementation steps in owning chunk | Keep it only as a service-role compatibility wrapper that delegates to the new three-argument implementation; update repo callers to pass `p_generation_count`. |
| Numeric string parsing can accept surprising JavaScript formats such as `"1e1"`. | Validation reconciliation | `01-backend-generation-count-contract.md` | Implementation steps in owning chunk | Accept only trimmed decimal integer strings in the range `1..52`. |
| Local Supabase may be unavailable in a worker environment. | Verification risk | `01-backend-generation-count-contract.md` | Final verification report | If unavailable, record verification-environment blocker for Supabase-specific smoke commands only. |

## Approved Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`01-backend-generation-count-contract.md`](plans/01-backend-generation-count-contract.md) | Add `generation_count` to the SQL RPC and `schedule-generate` Edge Function with server-side validation and compatibility defaults. | None | `02-frontend-generation-count-control.md` | Written |
| [`02-frontend-generation-count-control.md`](plans/02-frontend-generation-count-control.md) | Add the manager UI numeric control in the reusable package and send `generation_count` in Generate requests. | `01-backend-generation-count-contract.md` | Manager-controlled generation from the package/playground UI | Written |

## Dependency Order

1. `01-backend-generation-count-contract.md`
2. `02-frontend-generation-count-control.md`

The chunks should run serially because frontend generation requests depend on the Edge Function accepting `generation_count`.

## Shared Contracts

- Edge Function name: `schedule-generate`.
- Request field: `generation_count`.
- SQL parameter: `p_generation_count`.
- RPC overload handling: `generate_schedule_classes(uuid, uuid, integer)` is canonical; `generate_schedule_classes(uuid, uuid)` may exist only as a wrapper that delegates with `p_generation_count := null`.
- Valid range: integer `1..52`.
- Valid string format: trimmed base-10 integer strings only; reject scientific notation, decimals, signs, blank strings, and whitespace-only strings.
- Default behavior: missing or null count resolves to `products.generation_horizon_weeks`, then `8`.
- Count scope: per active schedule when `schedule_id` is null.
- Response shape stays unchanged: `{ created_count, existing_count, skipped_count }`.
- Browser access remains Edge-Function-only.

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| Managers can choose a generate count from schedule UI. | `plans/02-frontend-generation-count-control.md` | Adds numeric input and local validation in `ScheduleEditor`. |
| `schedule-generate` accepts and validates `generation_count`. | `plans/01-backend-generation-count-contract.md` | Adds request parser and validation. |
| RPC uses requested count without direct browser RPC access. | `plans/01-backend-generation-count-contract.md` | Edge Function passes `p_generation_count`; grants remain service-role-only. |
| Default remains 8 when omitted. | `plans/01-backend-generation-count-contract.md`, `plans/02-frontend-generation-count-control.md` | Backend fallback plus UI initial value. |
| Existing schedule ownership, status, skip-date, timezone, and idempotency behavior remains. | `plans/01-backend-generation-count-contract.md` | Migration preserves existing source and conflict behavior while adding row limiting. |
| Package/playground verification covers the UI. | `plans/02-frontend-generation-count-control.md` | Build commands and manual smoke steps. |

## Verification Strategy

Backend verification:

- From `backend/`, run `rtk npm run supabase:reset`; expected: local database resets and migrations apply.
- From `backend/`, run `rtk npm run supabase:db-lint`; expected: no new fatal migration issues from the generation-count migration.
- From `backend/`, serve functions with `rtk npm run supabase:functions` when running Edge Function curl smoke.
- Curl `schedule-generate` with invalid counts; expected `400 bad_request`.
- Curl `schedule-generate` with `generation_count: 3`; expected counts reflect at most three processed candidate occurrences for the active schedule and no duplicates on repeat.

Frontend/package verification:

- From repo root, run `rtk npm run build:package`; expected: TypeScript package build passes.
- From repo root, run `rtk npm run build:playground`; expected: playground Vite build passes.
- From repo root, run `rtk npm run lint`; expected: ESLint passes.
- Manual playground smoke when available: active schedule + count field + Generate produces expected created/existing/skipped message.

## Risks And Sequencing Notes

- SQL row limiting must happen after recurrence matching and before insert so `generation_count` means processed candidate occurrences, with skipped dates counted but not materialized.
- The migration must not leave the existing two-argument RPC body intact. Either repo callers use the three-argument call or the two-argument SQL overload delegates to the same count-aware implementation.
- The all-schedule case needs per-schedule limiting. A single global `limit` is incorrect.
- Do not broaden this into product settings, schedule overrides, payments, registrations, or dashboard redesign.
- Keep grants for `generate_schedule_classes` restricted to `service_role`.

## Execution Handoff

Recommended next skill: `$pmp-executing-plans`.

Execution should load:

- `docs/2026-06-09-generation-count-control/plan.md`
- selected chunk plan files under `docs/2026-06-09-generation-count-control/plans/`
- `docs/2026-06-09-generation-count-control/spec.md`
- `docs/2026-06-09-generation-count-control/agenda.md`

Recommended execution mode:

- Execute all chunks in dependency order.

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing dependencies, or user-requested changes.

## User Approval

Planner phase instruction approved one-pass chunk generation without waiting for a user gate. Future implementation should still treat this plan set as the approved scope and avoid expanding beyond these two chunks.
