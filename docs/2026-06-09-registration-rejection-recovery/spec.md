# Registration Rejection Recovery Design

Status: Final design for implementation planning.

Date: 2026-06-09

## Goal

Allow a manager to recover from an accidental or changed rejection of a class registration. From a rejected registration, the manager must be able to either approve the rejected registration directly or allow the user to submit a fresh registration.

## Current Context

The only rejection lifecycle in the current codebase is class registration rejection. `product_users` has `active` and `inactive` statuses, but no rejected user state. Therefore this design treats the Trello title's "rejecting a user" language as shorthand for rejecting a user's class registration.

Relevant current behavior:

- `backend/supabase/migrations/20260607160000_registration_engine.sql` created `class_registrations.status` values `pending`, `approved`, `rejected`, and `cancelled`.
- `class_registrations_one_live_idx` blocks only `pending` and `approved` duplicates for the same `(class_id, user_id)`. Rejected registrations are non-live.
- `backend/supabase/functions/manage-registrations/index.ts` exposes manager actions `list_pending`, `list_class`, `approve`, `reject`, and `cancel`.
- `public.manage_class_registration(...)` currently rejects `approve` unless the registration is still `pending`.
- `backend/supabase/functions/classes/index.ts` returns a user's `user_registration` only for `pending` or `approved`, which already lets users re-register after a rejected registration once the list refreshes.
- `packages/class-management-react/src/components/manager/pending-registrations.tsx` only renders pending registrations, so managers have no visible recovery path after pressing Reject.

## User-Facing Behavior

Managers get a recovery surface for rejected registrations in the manager class workflow:

- A rejected registration row is visible in manager class operations.
- The row offers two actions:
  - `Approve`: approve the rejected registration directly.
  - `Allow re-register`: mark the rejection as recovered for re-registration, keep the row non-live, and refresh manager/user state so the user can submit a fresh registration.
- If the user already submitted a new live registration after the rejection, approving the older rejected registration fails with a clear conflict instead of creating duplicate live registrations.
- Users continue to see rejected registrations as non-live in class discovery. After manager rejection, a refreshed user class list should show no active registration for that class and should allow a new registration attempt.

The design intentionally avoids adding a new public user-facing rejected-state button. The user re-registers through the existing `Register` button once their class list refreshes.

## Technical Design

### Backend Contract

Extend `manage-registrations` with two manager actions:

- `approve_rejected`: approves an existing rejected registration.
- `allow_reregister`: validates that the target registration is rejected and non-live, returns success, and does not rewrite historical rejection state.

`approve_rejected` should reuse the same approval business rules as current pending approval:

- target registration must belong to the manager's current product
- target registration must have status `rejected`
- the class must still be registerable through `private.ensure_class_registerable`
- class capacity must still have room
- membership stock consumption uses the registration's stored `membership_grant_id` through `private.consume_registration_stock`
- no other `pending` or `approved` registration may exist for the same `(class_id, user_id)`
- `approved_at`, `stock_consumed`, and membership ledger writes should match current manager approval behavior

`allow_reregister` should be deliberately lightweight:

- target registration must belong to the manager's current product
- target registration must have status `rejected`
- the function sets recovery metadata on the rejected registration
- the function returns the rejected registration with status still `rejected`
- no membership ledger entry is written because no membership-backed action occurs

The existing unique index is part of the design. Because it already treats `rejected` as non-live, allowing re-registration does not require deleting, cancelling, or changing the rejected status. The only mutation is recovery metadata that removes the row from the actionable manager recovery queue.

### Frontend Contract

Add a manager-facing rejected-registration recovery panel near the current pending queue. It may be implemented inside `PendingRegistrations` or as a small sibling component if that keeps the existing component readable.

The manager UI should:

- load pending registrations as it does today
- load rejected registrations by class through `manage-registrations` `list_class` and filter client-side to `status === "rejected"`, unless the backend chunk adds a narrower `list_rejected` action as a small implementation convenience
- show class name, user id, rejection/creation timestamp, and recovery buttons
- call `approve_rejected` for direct approval
- call `allow_reregister` for the re-register recovery path
- refresh the pending/rejected queue and manager class list after either action
- display capacity/membership/conflict failures using existing message patterns

## Data / State

No new table is required.

Required database migration:

- add rejection/recovery metadata columns to `class_registrations`:
  - `rejected_at`
  - `rejected_by`
  - `rejection_recovered_at`
  - `rejection_recovered_by`
  - `rejection_recovery_action` with values `approve_rejected` or `allow_reregister`
- replace `public.manage_class_registration(...)` with support for `approve_rejected` and `allow_reregister`
- set `rejected_at` and `rejected_by` on new manager rejections
- set recovery metadata on both recovery actions
- keep the function security-definer and fixed `search_path`
- keep function grants service-role-only

Rejected registration history stays in `class_registrations`. `allow_reregister` keeps `status = 'rejected'`; `approve_rejected` changes the row to `approved` but records that it was recovered from rejection through `rejection_recovery_action`.

## Permissions / Security

Only product managers and platform admins operating through manager context can recover rejected registrations. Frontend role checks remain cosmetic; backend `requireProductManager(ctx)` remains authoritative.

The recovery actions must remain product-scoped. A manager cannot recover a registration from another product by guessing a `registration_id`.

`approve_rejected` must check duplicate live registrations before approval so an old rejected row cannot be approved after the user already re-registered and became pending or approved.

## Error Handling

Expected backend error mapping:

- rejected registration not found: `404 not_found`
- recovery action against the wrong status: `400 bad_request`
- another live registration already exists for the same user/class: `409 conflict`
- capacity full, class not registerable, membership stock depleted, or membership requirement failure: `400 bad_request`
- unsupported action: `400 bad_request`

The frontend should show the backend message without hiding which recovery action failed.

## Testing Strategy

Planning verification should focus on static artifact correctness. Implementation verification should include:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- from `backend/`, `rtk npm run supabase:migrations`
- when a local Supabase stack is available, SQL or Edge Function smoke covering:
  - pending -> rejected
  - rejected -> approve_rejected -> approved
  - rejected -> allow_reregister -> rejected unchanged, then user register creates a new pending/approved row
  - rejected -> user re-registers -> approve_rejected on old rejected row fails with conflict

## Planning Boundary Guidance

Use two implementation chunks:

1. Backend registration recovery contract: SQL function migration, Edge Function action types/error mapping, and backend smoke notes.
2. Manager recovery UI: manager API types, rejected-registration panel/actions, refresh behavior, and static package/playground validation.

## Acceptance Criteria

- A manager can approve a rejected class registration when no live replacement registration exists and the class still satisfies approval rules.
- A manager can choose "Allow re-register" for a rejected registration without deleting the row or changing its rejected status.
- A user can submit a new registration after rejection through the existing register flow.
- Approving an old rejected registration after the user already has a live replacement registration fails with a conflict.
- Recovery actions remain product-scoped and manager-only.
- Existing pending approval/rejection/cancellation behavior remains unchanged.

## Assumptions

- "Rejected user" means a user with a rejected class registration, not a rejected product access row.
- Re-registration means a new class registration row created by the user, not converting the old rejected row back to pending.
- Rejected history should be preserved for auditability.

## Non-Blocking Risks

- The UI will initially identify users by `user_id`, matching the current pending-registration queue. Joining display names/emails can be a later manager UX improvement.
- `allow_reregister` does not consume membership stock or create a new registration. It only records manager recovery metadata and clears the row from the actionable recovery queue.
