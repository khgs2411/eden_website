# Registration Rejection Recovery Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- The repository has class registration rejection, not product-user rejection. `product_users.status` is only `active` or `inactive`.
- Rejected class registrations are non-live because `class_registrations_one_live_idx` only covers `pending` and `approved`.
- User re-registration after rejection should create a fresh registration row and preserve the rejected row with recovery metadata.
- Direct approval of a rejected registration is a manager recovery action and must fail if another live registration exists for the same class/user.
- No ADR is required because the design follows the existing registration lifecycle and unique-index model.

## Questions

### Question 1: Which rejected entity is in scope?

- Status: Answered
- Branch type: Initial
- Why it matters: The title says "rejecting a user", but the codebase has no rejected product-user state. Planning against the wrong lifecycle would create the wrong schema and UI.
- Scenario probe: A manager clicks Reject in `PendingRegistrations`; the affected row is a `class_registrations` row, not a `product_users` row.
- Options:
  - A. Class registration rejection - matches existing `approve`/`reject` manager workflow and current schema.
  - B. Product user access rejection - would require inventing a new product-user lifecycle not present in the repo.
- Recommendation: A. Treat the task as class registration rejection recovery.
- Answer: Use A, based on codebase evidence.
- Answer impact: Resolves branch
- Spec impact: Spec explicitly scopes recovery to rejected class registrations.
- Context impact: Updated `CONTEXT.md` with Registration Rejection Recovery.
- ADR impact: Not needed; the decision disambiguates scope but does not introduce a hard-to-reverse architecture tradeoff.
- Follow-ups: None.

### Question 2: What does "allow re-register" mean?

- Status: Answered
- Branch type: Initial
- Why it matters: The system can either mutate the rejected row, delete it, or let the user create a fresh row. Only one preserves history cleanly.
- Scenario probe: A user was rejected yesterday. The manager changes their mind but wants the user to re-submit so the new request is timestamped separately.
- Options:
  - A. Keep the rejected row rejected, mark it recovered for re-registration, and let the user create a fresh registration - preserves audit history, gives the manager action a durable effect, and matches the existing partial unique index.
  - B. Convert rejected back to pending - hides that the user intentionally re-submitted and can make manager queues ambiguous.
  - C. Delete or cancel the rejected row - weakens the rejection audit trail.
- Recommendation: A. Keep rejected as historical and non-live.
- Answer: Use A.
- Answer impact: Resolves branch
- Spec impact: `allow_reregister` records recovery metadata, not a destructive status rewrite.
- Context impact: Updated term says avoid deleting rejection history or silently resetting status.
- ADR impact: Not needed; this follows the existing live-registration index design.
- Follow-ups: None.

### Question 3: How should direct approval of a rejected registration handle duplicate live rows?

- Status: Answered
- Branch type: Dependency
- Why it matters: Since rejected rows do not block fresh registrations, an old rejected row might be approved after the user has already re-registered.
- Scenario probe: Manager rejects registration R1, user registers again and gets pending R2, then manager tries to approve R1.
- Options:
  - A. Fail with conflict when another pending/approved row exists - prevents duplicate live registrations.
  - B. Cancel the newer row automatically and approve the old row - surprising and destructive.
  - C. Approve both - violates existing uniqueness/live-registration model.
- Recommendation: A. Fail clearly.
- Answer: Use A.
- Answer impact: Resolves branch
- Spec impact: `approve_rejected` must check for another live registration before approval and map the error to conflict.
- Context impact: Not needed; no new domain term.
- ADR impact: Not needed; this preserves an existing invariant.
- Follow-ups: None.

### Question 4: Should recovery be backend-first or UI-only?

- Status: Answered
- Branch type: Initial
- Why it matters: UI-only recovery would not let managers approve rejected rows and would leave no reusable API contract for future Consumer Websites.
- Scenario probe: A future Consumer Website needs the same manager recovery flow without copying Eden playground state logic.
- Options:
  - A. Backend-first Edge Function/RPC contract plus manager UI - reusable and secure.
  - B. UI-only hints around the existing register flow - does not support direct approval and is easy to drift.
- Recommendation: A. Add backend actions and then expose them in the manager UI.
- Answer: Use A.
- Answer impact: Resolves branch
- Spec impact: Planning is split into backend and frontend chunks.
- Context impact: Not needed.
- ADR impact: Not needed; Edge Function API boundary is already established by existing ADR/spec.
- Follow-ups: None.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, sequencing.
- Result: The design is sufficient for planning. The main lifecycle ambiguity was whether "re-register" mutates the rejected row; it is resolved as fresh registration while preserving rejection history and recording recovery metadata.
- Remaining non-blocking risks:
  - Manager UI may initially show only `user_id` for rejected rows, matching current pending-registration UX.
  - `allow_reregister` is intentionally lightweight because the database already treats rejected registrations as non-live.
