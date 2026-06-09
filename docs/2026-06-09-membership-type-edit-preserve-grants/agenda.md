# Membership Type Editing Without Retroactive Grant Changes Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- Membership selling is out of scope.
- Managers manually create membership types and grant memberships to product users.
- One active membership grant per product user is enforced for v1.
- Upgrades replace the old active grant and do not preserve unused value.
- Membership grants already store issued entitlement values separately from membership type defaults.
- Consumer frontends call Edge Functions, not direct table or RPC APIs.
- `update_type` rejects incompatible non-null default fields while accepting omitted or `null` irrelevant defaults as no-op/clear-to-null semantics.

## Questions

### Question 1: Interpret "edit membership" as type edit or grant edit

- Status: Answered
- Branch type: Initial
- Why it matters: Editing an issued grant would directly change what a user already received, while editing a membership type can affect future grants without mutating existing grants.
- Scenario probe: A manager created a 10-class stock membership type, granted it to Alice, then wants future grants to use 12 classes. Alice's existing grant should still show the original issued stock state.
- Options:
  - A. Edit membership type defaults for future grants only.
  - B. Edit individual membership grants after issuance.
  - C. Add both type edit and grant edit.
- Recommendation: A. It matches the task phrase "without changing what was already granted" and the current schema already separates type defaults from grant entitlements.
- Answer: Use A. Treat the feature as membership type editing. Grant editing is out of scope because it would alter an issued entitlement.
- Answer impact: Resolves branch
- Spec impact: The spec defines this as membership type editing and explicitly excludes `edit_grant`.
- Context impact: Updated `CONTEXT.md` with Membership Type and Membership Grant definitions.
- ADR impact: Not needed; this is domain vocabulary and scoped feature behavior, not a durable architectural fork.
- Follow-ups: Question 2 confirms which fields can be edited safely.

### Question 2: Editable field boundary

- Status: Answered
- Branch type: Dependency
- Why it matters: Changing mode after grants exist would make old and future grant behavior hard to explain, while changing defaults is already compatible with grant snapshots.
- Scenario probe: A manager changes a `stock` type into `infinite`. Existing grants have stock counters, but future grants would be unlimited if mode were mutable.
- Options:
  - A. Allow name and mode-appropriate defaults only; keep mode immutable.
  - B. Allow mode edits and migrate existing grants.
  - C. Allow mode edits for future grants only.
- Recommendation: A. It keeps the existing grant invariant clear and avoids mixed semantics for one type id.
- Answer: Use A. Managers can edit `name`, `default_stock`, and `default_duration_days` according to the type's existing mode. `mode` remains immutable.
- Answer impact: Resolves branch
- Spec impact: The spec names the editable fields and backend validation rules.
- Context impact: Not needed; no new domain term was introduced.
- ADR impact: Not needed; this is a field-level safety rule.
- Follow-ups: Question 3 resolves whether a schema migration is needed.

### Question 3: Entitlement preservation mechanism

- Status: Answered
- Branch type: Dependency
- Why it matters: The plan should not add schema unless the current data model cannot preserve old grant values.
- Scenario probe: A stock type's default changes from 10 to 12 after Alice has a grant with `total_stock = 10` and `remaining_stock = 7`.
- Options:
  - A. Use existing `membership_grants` entitlement columns and add smoke verification.
  - B. Add a new grant snapshot table.
  - C. Copy every type field into grant metadata retroactively.
- Recommendation: A. `membership_grants` already stores the issued entitlement values that matter for registration and stock.
- Answer: Use A. No migration is required for entitlement preservation. Verification must prove grant rows remain unchanged after type edits.
- Answer impact: Resolves branch
- Spec impact: The spec says no new table or migration is required and names the grant columns that must remain unchanged.
- Context impact: Not needed; the Membership Grant definition already captures this boundary.
- ADR impact: Not needed; this is an implementation fit to existing schema.
- Follow-ups: Question 4 captures the display-name risk.

### Question 4: Historical display names

- Status: Non-blocking Risk
- Branch type: Risk
- Why it matters: Current grant displays resolve membership type names from the current type row, so editing the type name can change old grant labels even though entitlement values stay unchanged.
- Scenario probe: A type named "Summer 10 Pack" is granted, then renamed "Fall 12 Pack". Old grants may display the new name but still show their original stock values.
- Options:
  - A. Accept current-name display for v1 and keep entitlement values visible.
  - B. Add grant snapshot fields for type name and defaults.
  - C. Disallow name edits after any grants exist.
- Recommendation: A. The task is about not changing what was granted; the current grant row already preserves entitlement values. Snapshot display names can be a later UX/audit improvement.
- Answer: Use A and record the display-name snapshot as a non-blocking risk.
- Answer impact: Resolves branch
- Spec impact: The spec notes that a type name edit may affect labels for old grants but not entitlement values.
- Context impact: Not needed.
- ADR impact: Not needed; accepted v1 UI tradeoff.
- Follow-ups: None.

### Question 5: Irrelevant default-field payload semantics

- Status: Answered
- Branch type: Pressure-test
- Why it matters: The backend contract must be strict enough to reject bypassed UI payloads, while the UI and schema already use `null` for disabled or empty default fields.
- Scenario probe: A caller bypasses the manager UI and sends `default_stock: 12` while editing an `infinite` type. A separate caller sends `default_stock: null` for the same type because a disabled field serialized as null.
- Options:
  - A. Reject every presence of an irrelevant default field, including `null`.
  - B. Accept omitted or `null` irrelevant defaults, but reject incompatible non-null values.
  - C. Silently clear irrelevant defaults for any value.
- Recommendation: B. It preserves existing nullable default conventions and still rejects payloads that would imply incompatible future grant semantics.
- Answer: Use B. `update_type` should allow omitted irrelevant fields and irrelevant `null`, but reject incompatible non-null values with `400 bad_request`. Supported fields can be omitted, cleared with `null`, or set to a positive integer.
- Answer impact: Resolves branch
- Spec impact: The spec now contains explicit mode/default payload semantics and negative verification requirements.
- Context impact: Not needed; no new domain term was introduced.
- ADR impact: Not needed; this is an API validation contract refinement, not a durable architecture fork.
- Follow-ups: Backend Chunk 01 must implement this validation; Frontend Chunk 02 should omit irrelevant fields from the payload.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, sequencing, user review points.
- Result: The design is sufficient for planning after refining the `update_type` invalid-payload contract. The domain ambiguity was whether "membership" meant type or grant; repository evidence supports membership type editing because grant editing would contradict the preservation requirement.
- Remaining non-blocking risks:
  - Existing grant cards may display the current membership type name after a rename because grants store type id, not type-name snapshots.
  - Runtime Supabase smoke may be unavailable in some worker environments; verification plans must separate static build checks from local-stack smoke.
