# Schedule Generation Count Control Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- Product workflows stay behind Edge Functions; browser code must not call product tables or RPCs directly.
- Generated classes are concrete snapshots and generation must remain idempotent.
- The existing reusable frontend package owns manager workflow components after extraction.
- `schedule-generate` is the Edge Function route for generation.
- The task asks for control from both UI and Edge Function, so both surfaces must change.
- Refinement audit decision: the new three-argument RPC is the canonical implementation; the old two-argument overload may remain only as a service-role compatibility wrapper that delegates to the new function with `p_generation_count := null`.

## Questions

### Question 1: Count Meaning

- Status: Answered
- Branch type: Initial
- Why it matters: Existing code uses an 8-week product horizon, but the task says "generate count"; those produce different outcomes for multi-day weekly schedules.
- Scenario probe: A weekly schedule runs Sunday and Wednesday. If the manager enters `8`, should generation create 8 occurrences or all occurrences across 8 weeks?
- Options:
  - A. Occurrence count — matches the task wording and gives the manager direct control over how many concrete classes appear.
  - B. Week count — matches the existing database column but is less literal for UI control and can create an unexpected number of classes.
- Recommendation: A. Treat the UI field as occurrence count and keep the old product horizon column only as the default source.
- Answer: Use candidate occurrence count. Skipped dates are part of the processed occurrence set and reduce created rows while increasing `skipped_count`.
- Answer impact: Resolves branch
- Spec impact: Spec defines request field `generation_count`, default `8`, count-based RPC behavior, and skipped-date count semantics.
- Context impact: Not needed; existing `Generation Horizon` remains sufficient and the request-level field is an API detail.
- ADR impact: Not needed; this is a small contract extension, not a durable architecture reversal.
- Follow-ups: None.

### Question 2: Count Scope For All-Schedule Generation

- Status: Answered
- Branch type: Initial
- Why it matters: `schedule-generate` supports `schedule_id: null`, so the count can be global across all active schedules or per schedule.
- Scenario probe: A product has three active schedules and the caller sends `generation_count: 8` without `schedule_id`. Should one busy schedule consume all 8, or should each schedule get up to 8 occurrences?
- Options:
  - A. Per active schedule — preserves fairness and matches a manager's likely expectation for generation.
  - B. Global across all schedules — simpler SQL limit but can starve later schedules depending on ordering.
- Recommendation: A. Apply count per active schedule.
- Answer: Use per-active-schedule count when `schedule_id` is null.
- Answer impact: Resolves branch
- Spec impact: Spec requires per-schedule count semantics for all-schedule generation.
- Context impact: Not needed; no new domain term.
- ADR impact: Not needed; bounded implementation decision.
- Follow-ups: Backend chunk must use partitioned row numbering or equivalent SQL to enforce per-schedule limits.

### Question 3: Validation Range

- Status: Answered
- Branch type: Initial
- Why it matters: The Edge Function must prevent malicious or accidental unbounded generation.
- Scenario probe: A client sends `generation_count: 10000` directly to the Edge Function.
- Options:
  - A. `1..52` — aligns with the existing `generation_horizon_weeks` constraint and gives a safe maximum.
  - B. `1..8` — preserves current maximum but weakens the point of adding control.
  - C. `1..365` — flexible but too large for this first UI control.
- Recommendation: A. Use `1..52`.
- Answer: Use `1..52`.
- Answer impact: Resolves branch
- Spec impact: Spec records Edge Function and RPC validation bounds.
- Context impact: Not needed.
- ADR impact: Not needed.
- Follow-ups: Edge Function and RPC should both validate bounds.

### Question 4: Product Default Compatibility

- Status: Answered
- Branch type: Risk
- Why it matters: Renaming or removing `generation_horizon_weeks` would expand the task into a data model cleanup.
- Scenario probe: An old caller omits the count after the new migration. Should generation still default to 8?
- Options:
  - A. Keep `generation_horizon_weeks` as the default source — backward-compatible and minimal.
  - B. Replace it with `generation_count` on `products` — cleaner naming but requires broader migration and docs updates.
  - C. Remove product default entirely — simple request contract but loses current default behavior.
- Recommendation: A. Keep the existing column and use it as the fallback default.
- Answer: Keep the existing column as fallback default.
- Answer impact: Resolves branch
- Spec impact: Spec explicitly avoids renaming the column in this task.
- Context impact: Not needed; no glossary change because the existing term remains valid as a default horizon concept.
- ADR impact: Not needed; compatibility-preserving tactical decision.
- Follow-ups: Non-blocking risk recorded for possible future naming cleanup.

### Question 5: UI Placement

- Status: Answered
- Branch type: Initial
- Why it matters: The extracted package owns schedule workflow UI, and Eden-specific code should not regain product logic ownership.
- Scenario probe: If Eden later consumes the reusable package, should this control appear automatically with the workflow component?
- Options:
  - A. Add the control to `ScheduleEditor` in the package — one reusable behavior surface.
  - B. Add the control only in the playground — faster smoke path but not reusable.
  - C. Add a product settings page — too broad for this task.
- Recommendation: A. Add it to the package `ScheduleEditor`.
- Answer: Add the control to package `ScheduleEditor`.
- Answer impact: Resolves branch
- Spec impact: Spec names `packages/class-management-react/src/components/manager/schedule-editor.tsx`.
- Context impact: Not needed.
- ADR impact: Not needed.
- Follow-ups: Frontend chunk owns package build and playground build verification.

### Question 6: Old RPC Overload Handling

- Status: Answered
- Branch type: Pressure-test
- Why it matters: Postgres keeps `generate_schedule_classes(uuid, uuid)` and `generate_schedule_classes(uuid, uuid, integer)` as separate overloads. If the old two-argument implementation remains, `backend/supabase/functions/schedules/index.ts` can continue using horizon-week behavior while `schedule-generate` uses occurrence-count behavior.
- Scenario probe: Schedule activation calls the RPC without `generation_count` after the new migration. Does it use the same count-aware implementation as the manager Generate button?
- Options:
  - A. Drop the two-argument overload after updating all repo callers — simplest final surface, but riskier for any external service-role caller.
  - B. Keep the two-argument overload only as a delegating compatibility wrapper — preserves compatibility while guaranteeing one implementation.
  - C. Leave the old two-argument implementation unchanged — unsafe because real repo callers can retain stale behavior.
- Recommendation: B. Keep a wrapper for compatibility, but make repo-owned callers use the three-argument contract explicitly.
- Answer: Use B. The migration must replace the two-argument body with a wrapper that calls `generate_schedule_classes(p_product_id, p_schedule_id, null)`, and `schedules/index.ts` must pass `p_generation_count: null`.
- Answer impact: Resolves branch
- Spec impact: Spec now requires deliberate overload handling, mandatory `schedules/index.ts` caller update, and one count-aware implementation path.
- Context impact: Not needed; no new domain term.
- ADR impact: Not needed; tactical compatibility handling inside one RPC extension.
- Follow-ups: Backend chunk owns migration code, caller migration, and verification that both overloads resolve to count-aware behavior.

### Question 7: Numeric String Format

- Status: Answered
- Branch type: Pressure-test
- Why it matters: `Number("1e1")` parses to `10`, but accepting scientific notation in a manager-facing count field is surprising and can diverge from HTML number input expectations.
- Scenario probe: A direct client sends `"1e1"` or `"08"` as `generation_count`.
- Options:
  - A. Accept any JavaScript numeric string that parses to an integer — permissive but allows surprising formats.
  - B. Accept only trimmed decimal integer strings within `1..52` — predictable and simple to test.
  - C. Accept numbers only — strictest, but unnecessarily brittle for JSON clients.
- Recommendation: B. Accept normal decimal integer strings only.
- Answer: Use B. Valid string examples are `"8"` and `"52"`; invalid strings include `"1e1"`, `"8.0"`, `"+8"`, `""`, and whitespace-only values.
- Answer impact: Resolves branch
- Spec impact: Spec now defines decimal integer string validation instead of generic lossless parsing.
- Context impact: Not needed.
- ADR impact: Not needed.
- Follow-ups: Backend chunk parser code must use a decimal integer string guard before `Number(...)`.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, sequencing, user review points.
- Result: Refinement pressure-test added and resolved RPC overload and numeric-string validation branches. The design preserves the existing Edge Function boundary, keeps generated classes idempotent, avoids product-settings scope creep, and defines chunk ownership for backend then frontend.
- Remaining non-blocking risks:
  - `generation_horizon_weeks` naming is imperfect once request-level occurrence count exists.
  - Manual browser smoke depends on a local Supabase stack and seeded manager session; implementers may need to classify unavailable local Supabase as a verification-environment blocker rather than a product failure.
