# Schedule Generation Count Control Design

Status: Final design. Ready for implementation planning.

Date: 2026-06-09

## Goal

Let a manager choose how many schedule occurrences to materialize when using the existing Generate action. The selected count must travel through the reusable frontend package into the `schedule-generate` Edge Function and then into the schedule generation RPC, while preserving the existing manager-only Edge Function boundary and generated-class idempotency.

## Current Context

The current implementation already has rolling schedule generation:

- `backend/supabase/migrations/20260607112136_product_role_foundation.sql` defines `products.generation_horizon_weeks integer not null default 8 check (generation_horizon_weeks between 1 and 52)`.
- `backend/supabase/migrations/20260607153000_schedule_generation_engine.sql` defines `public.generate_schedule_classes(p_product_id uuid, p_schedule_id uuid default null)`.
- `backend/supabase/functions/schedule-generate/index.ts` accepts `product_key` plus optional `schedule_id`, requires product manager access, validates the schedule belongs to the product and is active, and calls the RPC.
- `packages/class-management-react/src/components/manager/schedule-editor.tsx` exposes Generate buttons for the selected schedule and for each listed active schedule.
- `packages/class-management-react/src/manager/manager-api.ts` defines `ScheduleGenerationResult` but does not define a request type for generation.

The old behavior is effectively fixed at 8 through `generation_horizon_weeks`. The task wording asks for control of the "generate count" from the UI and Edge Function, so this design treats the manager input as an occurrence count, not as a product-wide week horizon setting.

## User-Facing Behavior

The manager schedule editor should show a small numeric control near the Generate actions:

- Default value: `8`.
- Minimum value: `1`.
- Maximum value: `52`.
- The value is sent whenever the manager clicks Generate.
- The generation result message remains `Created X, existing Y, skipped Z`.
- If the manager enters an invalid value, the UI prevents the request or shows a local validation message.
- Existing active-schedule checks remain unchanged: inactive schedules cannot be generated.

The UI should be compact and operational, matching the current schedule editor style. This is not a redesign of the class-management manager dashboard.

## Technical Design

### Contract

Add a request field named `generation_count`:

```json
{
  "product_key": "eden",
  "schedule_id": "<schedule-id-or-null>",
  "generation_count": 8
}
```

Use `generation_count` consistently across the reusable package and Edge Function. The SQL RPC can use `p_generation_count` to match existing Postgres parameter naming.

### Backend

Add a migration that creates the count-aware canonical generation RPC signature:

```sql
public.generate_schedule_classes(
  p_product_id uuid,
  p_schedule_id uuid default null,
  p_generation_count integer default null
)
```

Postgres treats different function arities as overloads, so the migration must also handle the existing two-argument `public.generate_schedule_classes(uuid, uuid)` function deliberately. Keep it only as a service-role compatibility wrapper that delegates to the three-argument implementation with `p_generation_count := null`. Do not leave the old horizon-based implementation alive.

The RPC must:

- Resolve `v_generation_count` as `coalesce(p_generation_count, products.generation_horizon_weeks, 8)`.
- Validate that the resolved count is between `1` and `52`.
- Preserve `product_not_found` and `schedule_not_found` exceptions.
- Generate up to `v_generation_count` candidate occurrences per active schedule. Candidate occurrences include skipped dates; skipped dates are counted in `skipped_count` and do not create class rows.
- When `p_schedule_id` is null, apply the count per active schedule, not globally across all schedules.
- Continue excluding skip dates and counting skipped occurrences.
- Continue using the existing `classes_generated_unique` idempotency constraint.
- Never update existing generated class snapshots.

The existing `products.generation_horizon_weeks` column can remain as the default generation count source for backwards compatibility. It should not be renamed or removed in this task because that would increase migration and documentation risk without being required to satisfy the UI/Edge Function request.

### Edge Function

Update `backend/supabase/functions/schedule-generate/index.ts` to accept and validate `generation_count`.

Validation:

- Missing or `null`: use backend default.
- Number: must be an integer between `1` and `52`.
- Numeric string: may be accepted only when the trimmed value is a base-10 integer string between `1` and `52`, such as `"8"` or `"52"`. Scientific notation, decimal notation, signs, blank strings, and whitespace-only strings are invalid.
- Other values, decimals, `0`, negatives, and values above `52`: return `400 bad_request`.

The Edge Function must pass `p_generation_count` into `generate_schedule_classes`. It must keep the existing manager check, product context resolution, schedule ownership check, and active-schedule conflict behavior.

`backend/supabase/functions/schedules/index.ts` must also pass `p_generation_count: null` for schedule-activation generation so all repo-owned callers use the new count-aware contract. The retained two-argument SQL wrapper is for compatibility only, not for repo code paths.

### Frontend Package

Update the reusable frontend package, not an Eden-specific component:

- Add a `generationCount` state value to `ScheduleEditor`.
- Render a numeric input labeled `Generate count`.
- Send `{ schedule_id, generation_count }` to `schedule-generate`.
- Keep the same control value for all Generate buttons in the component.
- Disable generation or show a local message when the count is outside `1..52`.
- Add a small typed request helper or type in `packages/class-management-react/src/manager/manager-api.ts` if useful; avoid a broad API abstraction.

### Playground / Consumer

The class-management playground consumes the package, so package build verification is the main frontend check. If the playground already displays `ScheduleEditor`, no separate playground code should be needed beyond verifying the package output in the app.

## Data / State

No new table is required.

The durable backend default remains `products.generation_horizon_weeks`. The per-request UI value is transient request state. Generated class rows remain concrete snapshots with existing source metadata:

- `template_id`
- `schedule_id`
- `generated_for_date`
- `source_timezone`

## Permissions / Security

The browser still cannot call tables or RPCs directly. Generation remains behind `schedule-generate`, and `schedule-generate` remains manager-only.

The Edge Function owns request validation so malicious clients cannot bypass the UI and request unbounded generation. The upper bound of `52` matches the existing product-level check and protects the database from accidentally materializing a very large recurring schedule.

## Error Handling

Expected errors:

- `400 bad_request`: invalid `generation_count` or invalid `schedule_id` format.
- `404 not_found`: schedule does not exist in the current product.
- `409 conflict`: schedule exists but is not active.
- `500 internal_error`: unexpected RPC or database failure.

The UI should surface the Edge Function error message through the existing `message` state.

## Testing Strategy

Backend verification should cover:

- RPC defaults to 8 when no count is provided.
- RPC processes exactly the requested number of candidate occurrences for a simple weekly schedule when enough occurrences exist, bounded by schedule end date when present.
- RPC applies the requested count per active schedule when generating all schedules.
- Repeated generation remains idempotent.
- Edge Function rejects invalid counts with `400 bad_request`.
- Edge Function accepts a valid count and passes it to the RPC.

Frontend verification should cover:

- `rtk npm run build:package`.
- `rtk npm run build:playground`.
- `rtk npm run lint`.
- Manual playground smoke, if a local Supabase stack is available: create or select an active schedule, enter a count, click Generate, and verify the created/existing/skipped counts reflect the requested value.

## Planning Boundary Guidance

Implementation should be split into two chunks:

1. Backend/API generation-count contract: migration plus `schedule-generate` request validation and RPC call update.
2. Frontend package UI: schedule editor numeric input, request payload, type updates, and playground/build verification.

The backend chunk must land first because the UI depends on the Edge Function accepting `generation_count`.

## Acceptance Criteria

- Managers can choose a generate count from the schedule UI.
- `schedule-generate` accepts `generation_count` and validates it server-side.
- The generation RPC uses the requested count without direct browser RPC access.
- Default behavior remains 8 when no count is provided.
- Existing schedule ownership, active-status, skip-date, timezone, and idempotency behavior remains intact.
- Verification commands and manual smoke instructions are updated in the implementation handoff or final notes.

## Assumptions

- "Generate count" means occurrence count, not weeks.
- The default remains `8`.
- The count applies per schedule when generating all active schedules.
- The valid range remains `1..52`, matching the existing product default constraint.
- No product settings UI is required for this task.

## Non-Blocking Risks

- The existing database column name `generation_horizon_weeks` no longer perfectly describes the request-level behavior. Keeping it is a compatibility choice; a later cleanup could rename or replace it if product settings become part of the workflow.
- The current UI exposes only per-schedule Generate buttons. The Edge Function still supports all-schedule generation; implementers must preserve the all-schedule contract even if the UI does not expose it directly.
