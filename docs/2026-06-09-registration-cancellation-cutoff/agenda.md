# Registration Cancellation Cutoff Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- User-stated requirement: disable `Cancel registration` when the class is due to start in N hours.
- User-stated example: users may cancel up to 24 hours before class start.
- Repo evidence: current user cancellation is owned by `register-class` -> `public.cancel_class_registration(...)`.
- Repo evidence: current UI renders `Cancel registration` for pending/approved registrations in `packages/class-management-react/src/components/user/class-detail.tsx`.
- Repo evidence: manager cancellation and class-cancellation restoration are separate backend flows and must not be conflated with user cancellation.

## Questions

### Question 1: Where does the N-hour policy live?

- Status: Answered
- Branch type: Initial
- Why it matters: A cutoff can be global, product-level, class-level, or template-level. The storage choice affects schema, UI, and future consumer websites.
- Scenario probe: Eden wants 24 hours. A later product wants 12 hours across all classes. The system should support that without adding a class editor field before the current task needs one.
- Options:
  - A. Product-level setting with default 24 hours - minimal reusable policy that fits multi-tenant product scoping.
  - B. Hardcoded 24-hour constant - simplest code, but does not satisfy "N hours" as configurable product behavior.
  - C. Per-class field - most flexible, but reopens broader registration-policy editing and is more than the task asks.
- Recommendation: A. Store `registration_cancellation_cutoff_hours` on `products` with default 24.
- Answer: Use product-level `registration_cancellation_cutoff_hours` with default 24. Treat per-class overrides as future scope.
- Answer impact: Resolves branch
- Spec impact: Spec requires a product-level integer setting and explicitly excludes per-class override work.
- Context impact: Updated with **Cancellation Cutoff**.
- ADR impact: Not needed; this is an incremental product-policy setting, not a hard-to-reverse architecture decision.
- Follow-ups: None.

### Question 2: Which cancellation paths are blocked?

- Status: Answered
- Branch type: Initial
- Why it matters: User self-cancellation, manager registration cancellation, and manager class cancellation have different business meanings and membership-ledger effects.
- Scenario probe: A user cannot cancel 2 hours before class, but a manager may still cancel the class due to illness and restore affected membership stock.
- Options:
  - A. Block only user-initiated registration cancellation after the cutoff.
  - B. Block both user and manager cancellation after the cutoff.
  - C. Block only UI cancellation and leave backend unchanged.
- Recommendation: A. The task says users cancel registration; manager recovery/correction paths should remain operational.
- Answer: Block only user-initiated cancellation through `register-class` / `cancel_class_registration` with `p_force_restore = false`. Manager/class cancellation flows remain unchanged.
- Answer impact: Resolves branch
- Spec impact: Spec distinguishes user cancellation cutoff from manager cancellation and class-cancellation restoration.
- Context impact: Not needed; no new glossary term beyond Cancellation Cutoff.
- ADR impact: Not needed; aligns with existing role separation.
- Follow-ups: None.

### Question 3: Where is enforcement authoritative?

- Status: Answered
- Branch type: Initial
- Why it matters: UI-only disabling can be bypassed by stale clients or direct Edge Function calls.
- Scenario probe: A user loads the page 25 hours before class start, leaves it open, then clicks cancel 23 hours before start.
- Options:
  - A. Enforce in the database function and expose server-computed UI state.
  - B. Enforce only in the Edge Function.
  - C. Enforce only in the React UI.
- Recommendation: A. The database function owns cancellation and membership ledger behavior, so it should own the invariant.
- Answer: Enforce in `public.cancel_class_registration(...)`, map the error in `register-class`, and expose server-computed `can_cancel_registration` for UI state.
- Answer impact: Resolves branch
- Spec impact: Spec requires database enforcement plus frontend disabled state.
- Context impact: Not needed.
- ADR impact: Not needed; follows existing backend-authoritative design.
- Follow-ups: None.

### Question 4: What should users see after the cutoff?

- Status: Answered
- Branch type: Initial
- Why it matters: Hiding all actions without explanation makes a live pending/approved registration look stuck or broken.
- Scenario probe: A user has an approved registration 10 hours before class. They need to understand they are still registered but cancellation is closed.
- Options:
  - A. Show registration status and disabled/replaced cancel action with explanatory text.
  - B. Hide the cancel action with no explanation.
  - C. Keep the button enabled and rely on backend error after click.
- Recommendation: A. It is clear and still preserves backend enforcement.
- Answer: Show the live registration status and cancellation-closed messaging; disable or replace the cancel action.
- Answer impact: Resolves branch
- Spec impact: Spec requires user-visible cancellation-closed messaging and no working UI cancel action after cutoff.
- Context impact: Not needed.
- ADR impact: Not needed.
- Follow-ups: None.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle boundary, state persistence, backend enforcement, stale client recovery, handoff boundaries, verification evidence, scope control, manager/user role separation.
- Result: The design is sufficient for implementation planning. The only material future branch is per-class overrides, recorded as out of scope and non-blocking.
- Remaining non-blocking risks:
  - UI cutoff state may not update exactly at the boundary without refresh; backend still rejects stale cancellation attempts.
