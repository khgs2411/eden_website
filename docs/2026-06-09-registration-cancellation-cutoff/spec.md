# Registration Cancellation Cutoff Design

Status: Final design for implementation planning.

Date: 2026-06-09

## Goal

Disable user-driven class registration cancellation when the class starts within a configurable number of hours. The example product policy is a 24-hour cutoff: users may cancel until 24 hours before `classes.starts_at`, and after that the cancellation action is unavailable in the UI and rejected by the backend.

## Current Context

The extracted class-management product is the active surface for this work:

- Backend functions live under `backend/supabase/functions/`.
- Product migrations live under `backend/supabase/migrations/`.
- Reusable React workflow components live under `packages/class-management-react/`.
- The standalone playground lives under `apps/class-management-playground/`.

Relevant current behavior:

- `public.cancel_class_registration(...)` in `backend/supabase/migrations/20260608020000_membership_cancellation_audit.sql` allows cancellation for `pending` or `approved` registrations without checking a configurable cutoff.
- Stock restoration already depends on `v_class.starts_at > now()` unless `p_force_restore` is true.
- `backend/supabase/functions/register-class/index.ts` exposes the user `cancel` action and maps most registration business-rule failures into API errors.
- `backend/supabase/functions/classes/index.ts` returns `user_registration` only for live `pending` / `approved` registrations.
- `packages/class-management-react/src/components/user/class-detail.tsx` renders the `Cancel registration` button whenever the live registration is pending or approved.
- `packages/class-management-react/src/components/user/class-list.tsx` maps known backend registration errors to user-facing labels.

The earlier root product spec says v2 should add explicit per-class `registration_closes_at`, but this task asks for a cancellation cutoff only. This design should not add per-class registration-open/close scheduling or reopen the broader registration policy model.

## User-Facing Behavior

For a class with `starts_at = 2026-06-10T18:00:00Z` and a 24-hour cancellation cutoff:

- Before `2026-06-09T18:00:00Z`, a user with a pending or approved registration can cancel.
- At or after `2026-06-09T18:00:00Z`, the same user cannot cancel from the UI.
- If a stale browser still submits the cancel action after the cutoff, the backend rejects it.
- The class remains visible and the live registration status still displays as pending or approved.
- The UI should explain that cancellation is closed instead of silently hiding all registration state.

Manager cancellation remains separate. Existing manager cancellation and class-cancellation restoration flows must continue to work according to their current rules.

## Technical Design

### Backend Contract

Add a product-level cancellation cutoff setting and enforce it inside `public.cancel_class_registration(...)`.

Recommended minimal storage:

- Add `registration_cancellation_cutoff_hours integer not null default 24` to `public.products`.
- Add a check constraint requiring `registration_cancellation_cutoff_hours >= 0`.

Why product-level: the user asked for "N hours", and the current product model already scopes business policy by product. A product-level setting gives managers/products one reusable default without adding per-class policy complexity.

Backend behavior:

- User cancellation must be allowed only when `now() < v_class.starts_at - make_interval(hours => v_cutoff_hours)`.
- A cutoff of `0` means cancellation is allowed until class start, matching the previous effective user-cancellation window.
- If the cutoff has passed, raise `registration_cancellation_closed`.
- The check must live in the database function so stale clients, direct Edge Function calls, and future consumer websites cannot bypass it.
- `p_force_restore = true` must remain a manager/admin internal override for explicit backend flows and must not be used by the user `register-class` cancel action.
- Stock restoration should continue using the existing restoration decision; this task only changes whether user cancellation is permitted.

### API Contract

Update `backend/supabase/functions/register-class/index.ts` so `registration_cancellation_closed` maps to a client-visible `400 bad_request` message.

No new Edge Function is required. The existing `register-class` function remains the user registration/cancellation endpoint.

### Frontend Contract

Expose cutoff state in the user class listing payload so the reusable UI can disable cancellation before the user clicks:

- Add `registration_cancellation_cutoff_hours` and `can_cancel_registration` to class summaries returned by `classes` `list_user`.
- The value should be meaningful only when `user_registration` is live; for unregistered classes it may be `false`.
- `can_cancel_registration` should be computed from the server clock, not the browser clock.

Update package types and UI:

- Add `can_cancel_registration: boolean` and `registration_cancellation_cutoff_hours: number` to `UserClassSummary`.
- Keep rendering registration status for pending/approved registrations after cutoff.
- Disable or replace the cancel button when `can_cancel_registration` is false.
- Add a short label such as "Cancellation is closed for this class." for the disabled state.
- Keep the existing register button behavior unchanged for users without a live registration.

The UI may use a disabled button or a non-action status message. The important invariant is that users can see why they cannot cancel and cannot submit the action through normal UI controls.

## Data / State

One migration owns the product-level setting and database function replacement:

- `backend/supabase/migrations/20260609110000_registration_cancellation_cutoff.sql`

The migration should:

- Add `registration_cancellation_cutoff_hours` to `public.products`.
- Add a non-negative check constraint.
- Replace `public.cancel_class_registration(...)` with the same ledger behavior from `20260608020000_membership_cancellation_audit.sql` plus cutoff enforcement.
- Keep `security definer`, fixed `search_path`, function grants, and current cancellation ledger calls.

No new table is required.

## Permissions / Security

The backend remains authoritative. Frontend disabled state is user experience only.

The user `register-class` cancel action must continue to call `cancel_class_registration` with:

- `p_user_id = ctx.user.id`
- `p_created_by = ctx.user.id`
- `p_force_restore = false`

Manager workflows that explicitly cancel registrations or classes should not be blocked by the user cancellation cutoff unless the implementer intentionally routes them through the user cancel action, which would be wrong.

## Error Handling

Expected backend/API behavior:

- `registration_cancellation_closed`: `400 bad_request`, user-facing message that cancellation is closed for this class.
- `registration_not_found`: unchanged `404 not_found`.
- Existing membership, capacity, and class-registerable errors remain unchanged.

The package UI should map `registration_cancellation_closed` to a translated or package-level label and still show raw backend messages for unknown failures.

## Testing Strategy

Static verification:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`

Backend verification:

- From `backend/`, `rtk npm run supabase:migrations`.
- When local Supabase is available, run a rollback-safe SQL smoke that creates or locates:
  - a class starting more than N hours away, where user cancellation succeeds
  - a class starting within N hours, where user cancellation raises `registration_cancellation_closed`
  - a manager/class cancellation path showing manager cancellation behavior is not newly blocked

Manual playground smoke:

- User with live registration more than N hours before class start sees and can use `Cancel registration`.
- User with live registration inside the cutoff sees registration status plus cancellation-closed messaging and cannot click a working cancel action.
- A stale direct cancel submission inside the cutoff returns the backend error.

## Planning Boundary Guidance

Use two implementation chunks:

1. Backend cutoff contract: product setting, SQL function replacement, Edge Function error mapping, and backend smoke.
2. Package UI and playground messaging: class-list payload/type changes, disabled user cancel control, labels, and static/playground validation.

## Acceptance Criteria

- User cancellation is allowed only before `classes.starts_at - products.registration_cancellation_cutoff_hours`.
- Default cutoff is 24 hours.
- A cutoff value of 0 preserves the old "until class start" behavior.
- Backend rejects stale or direct user cancellation attempts after the cutoff.
- User UI disables or replaces `Cancel registration` after the cutoff while still showing the registration status.
- Manager cancellation/class-cancellation restoration behavior remains unchanged.
- Existing registration, approval, rejection, and membership ledger behavior is not otherwise changed.

## Assumptions

- "N hours" is a product-level policy for v1, not per-class or per-template.
- The default requested example, 24 hours, is the default product value.
- The cutoff applies only to user-initiated cancellation through the user registration endpoint.
- The backend should use server/database time as the source of truth.

## Non-Blocking Risks

- If a future product needs per-class cancellation deadlines, this product-level setting can be refined later into a class-level override. That is intentionally out of scope here.
- The current UI has no live countdown. It may require refresh to update the disabled state exactly at the cutoff boundary, but stale clicks are still rejected by the backend.
