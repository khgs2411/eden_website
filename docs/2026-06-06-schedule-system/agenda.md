# Schedule, Template, and Class Generation Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- Parent design lives at `docs/2026-06-06-class-management-product/spec.md`.
- The schedule system is a child spec, not a replacement for the global product spec.
- One shared Supabase backend/project is used across products.
- Every product-domain object is product-scoped with `product_id`.
- Frontends access the product backend only through Edge Functions.
- Managers operate templates, schedules, and classes. Platform admins do not create classes, schedules, templates, or memberships as ordinary product actions.
- Users register for concrete classes only, not schedules or templates.
- A class template is a schema/interface and is not date-bound or registerable.
- A schedule is a time-management tool that places class templates onto planned or repeating dates.
- A class is a concrete date-bound object with registration, attendance, lifecycle, visibility, capacity, location, policy, and custom data.
- Parent class fields include name, description, category, starts/ends, capacity, location, status, lifecycle status, visibility, registration policy, membership requirement, notes, custom data, and audit fields.
- Template fields support simple typed custom fields, not full nested JSON-schema behavior.
- Registration closes at `starts_at` in v1.

## Questions

### Question 1: Schedule-to-class generation lifecycle

- Status: Answered
- Branch type: Initial
- Why it matters: Users register for concrete classes, but schedules are recurrence/time-placement tools. The system must decide when concrete class rows exist, how managers preview them, and how duplicate generation is prevented.
- Scenario probe: A manager schedules "Beginner Salsa" every Tuesday for three months. They later cancel one Tuesday and change capacity on another. Users must register against stable class rows, and a refresh must not duplicate or overwrite the customized Tuesday unexpectedly.
- Options:
  - A. Explicit generation window — manager previews and publishes/refreshes concrete classes for a selected date range; generated classes can be individually edited/cancelled.
  - B. Lazy generation — schedule remains virtual until a user views/registers, then the backend creates class rows on demand.
  - C. Manual-only generation — schedule suggests dates, but manager manually creates each class from the template.
- D. Rolling explicit generation — manager activates a schedule once, and the backend keeps concrete future class rows materialized within a configured horizon, such as the next 8 or 12 weeks.
- Recommendation: D. It preserves the concrete-class safety of A while giving the polished manager experience expected from B.
- Answer: D. Use rolling explicit generation. The schedule is activated once and the backend automatically keeps concrete future class rows materialized within a configured generation horizon.
- Answer impact: Changes model
- Spec impact: The spec now treats rolling explicit generation as the resolved schedule-to-class lifecycle. This preserves concrete classes for registration, capacity, attendance, membership stock, overrides, cancellation, and audit behavior while avoiding manual creation of every class instance.
- Context impact: Not needed yet; `Schedule`, `Class Template`, and `Class` already exist in `CONTEXT.md`.
- ADR impact: Created ADR 0002 after dependent generation horizon, refresh/snapshot, exception, publication, recurrence, and timezone decisions were resolved.
- Follow-ups: Question 4 and Question 5 are now higher priority because rolling generation requires refresh protection and exception semantics.

### Question 2: Template defaults versus schedule overrides

- Status: Answered
- Branch type: Initial
- Why it matters: Templates define reusable class structure, but schedules may need default values that differ by time slot, weekday, or location. Without a clear inheritance model, implementers may duplicate templates or overload schedules.
- Scenario probe: The same "Beginner Salsa" template runs Tuesdays at Studio A with capacity 20 and Thursdays at Studio B with capacity 12. Should this be one template with two schedules that override location/capacity, or two separate templates?
- Options:
  - A. Template defines schema and base defaults; each schedule can override generation defaults such as time, capacity, location, visibility, registration policy, membership requirement, notes, and custom field defaults.
  - B. Template owns all defaults; schedules only provide dates/times.
  - C. Schedule owns most defaults; template only defines custom field schema.
- Recommendation: A. It avoids template duplication while keeping reusable product-specific class shape in the template.
- Answer: Modified B. The schedule selects a template in read-only fashion and controls time placement/generation only. The schedule cannot alter class defaults. If the manager wants to change future generated class values, they alter the template; already generated concrete classes keep their exact data values.
- Answer impact: Changes model
- Spec impact: The spec now removes schedule-level class default overrides. Templates own reusable class structure/defaults; schedules own recurrence/time placement and template selection. Generated classes are snapshots that do not update automatically when the template changes.
- Context impact: Updated `Class Override` wording in `CONTEXT.md` because automatic refresh protection is no longer the main distinction; the term now means a manager edit to a generated class after it becomes concrete.
- ADR impact: Created ADR 0002 as part of the broader schedule/materialization decision.
- Follow-ups: Added Question 9 for generation horizon and manifestation timing. Question 8 is mostly answered by this decision and should be marked resolved.

### Question 3: Recurrence scope for v1

- Status: Answered
- Branch type: Initial
- Why it matters: Recurrence breadth affects schema, UI complexity, timezone handling, preview logic, and test scope. Overbuilding recurrence now can delay the core product.
- Scenario probe: A manager needs classes every Tuesday and Thursday at 18:00 from July through September. Another asks for "first Sunday of each month except holidays." Which of these belongs in v1?
- Options:
  - A. V1 supports one-time and weekly recurrence with selected weekdays, start/end date, start time, duration/end time, and timezone.
  - B. V1 supports richer calendar rules such as monthly ordinal recurrence, exclusions, and holiday calendars.
  - C. V1 supports only one-time and manually repeated schedule entries.
- Recommendation: A. It covers the common class calendar model without turning v1 into a full calendar engine.
- Answer: A.
- Answer impact: Resolves branch
- Spec impact: The spec now defines v1 recurrence support as one-time placement and weekly recurrence with selected weekdays, start/end date, start time, duration/end time, and timezone. Monthly ordinal rules, holiday calendars, external calendar exceptions, and resource conflict detection are out of scope for v1.
- Context impact: Not needed. Recurrence fields are schema behavior, not domain glossary terms.
- ADR impact: Not needed. This is v1 scope control and can evolve without changing the core schedule architecture.
- Follow-ups: Timezone behavior remains open because recurrence must preserve local class times across daylight-saving changes.

### Question 4: Generated class refresh and override protection

- Status: Answered
- Branch type: Dependency
- Why it matters: Once generated classes exist, managers will edit individual occurrences. Refreshing the source schedule/template must not accidentally erase meaningful per-class overrides or break registrations.
- Scenario probe: A generated class has 10 approved registrations and a manager manually changed its location. Later the schedule location changes for future classes. Should that edited class update, stay unchanged, or ask the manager to choose?
- Options:
  - A. Refresh only creates missing future classes and updates untouched future classes; manually overridden or registered classes are protected unless explicitly selected.
  - B. Refresh rewrites all future generated classes from the latest template/schedule values.
  - C. Refresh never updates existing classes; it only creates missing classes.
- Recommendation: A. It balances manager convenience with safety for registered/customized occurrences.
- Answer: A at the time, later narrowed by Question 2. Rolling generation creates missing future classes. Existing generated classes are not automatically updated from schedule/template changes, even when untouched or unregistered.
- Answer impact: Resolves branch; later refined by Question 2
- Spec impact: The spec now states that rolling generation creates missing future classes from the current template, but generated classes are concrete snapshots and are not rewritten automatically.
- Context impact: Updated `CONTEXT.md` with `Class Override`, because override/protected occurrence is now core schedule language.
- ADR impact: Created ADR 0002 as part of the broader schedule/materialization decision.
- Follow-ups: Question 5 remains high priority because skip/cancel exception behavior must align with protected generated classes.

### Question 5: Schedule cancellation and skipped dates

- Status: Answered
- Branch type: Initial
- Why it matters: Managers need to cancel a full schedule, skip a future date, or cancel an already generated class without corrupting registration and membership behavior.
- Scenario probe: A manager cancels the whole August schedule after some August classes already have registrations, and skips only August 13 for a holiday. The system must decide which classes remain, which are cancelled, and what happens to future generation.
- Options:
  - A. Schedule supports skip exceptions before generation and class cancellation after generation; cancelling a schedule stops future generation but existing classes are handled explicitly.
  - B. Cancelling a schedule automatically cancels all future generated classes.
  - C. Schedules cannot be cancelled; managers cancel generated classes one by one.
- Recommendation: A. It keeps schedule state and class lifecycle separate while supporting common manager workflows.
- Answer: A.
- Answer impact: Resolves branch
- Spec impact: The spec now separates skipped dates, generated class cancellation, and schedule cancellation. Skipped dates prevent generation. Cancelling an existing class uses class lifecycle status. Cancelling or archiving a schedule stops future generation but does not automatically cancel existing generated classes.
- Context impact: Not needed. These are lifecycle rules using existing `Schedule` and `Class` terms; no new domain term is required yet.
- ADR impact: Created ADR 0002 as part of the broader schedule/materialization decision.
- Follow-ups: Schedule status and publication flow can now be refined around draft/active/paused/archived state.

### Question 6: Timezone and daylight-saving behavior

- Status: Answered
- Branch type: Risk
- Why it matters: A shared backend serves multiple product sites. Recurring local class times must remain stable across daylight-saving changes and products in different timezones.
- Scenario probe: Eden schedules a weekly class at 18:00 Asia/Jerusalem before a daylight-saving change. Future occurrences should remain at 18:00 local product time, not drift to 17:00 or 19:00 after UTC conversion.
- Options:
  - A. Store schedule timezone and recurrence in local wall-clock terms; generated classes store absolute `starts_at`/`ends_at` plus source timezone.
  - B. Store all schedule recurrence directly in UTC.
  - C. Use product-level timezone only and do not allow per-schedule timezone.
- Recommendation: A. It preserves manager intent for recurring local class time while keeping generated classes queryable by absolute timestamps.
- Answer: A.
- Answer impact: Resolves branch
- Spec impact: The spec now states that schedules store recurrence in local wall-clock terms with an IANA timezone, while generated classes store absolute `starts_at`/`ends_at` timestamps plus source timezone. Product timezone can default schedule timezone, but the schedule stores the timezone used for generation.
- Context impact: Not needed. Timezone is standard technical vocabulary, and no project-specific term was introduced.
- ADR impact: Created ADR 0002 because recurrence/time representation is hard to reverse and belongs to the rolling-generation architecture.
- Follow-ups: None.

### Question 7: Schedule status and publication flow

- Status: Answered
- Branch type: Dependency
- Why it matters: Templates, schedules, and classes can each have lifecycle/publication state. The manager workflow needs clear gates so drafts are not visible and users only see generated published classes.
- Scenario probe: A manager is drafting a schedule and previewing dates. Should classes exist as drafts before publish, or should no classes exist until the manager publishes the schedule generation window?
- Options:
  - A. Schedules have draft/active/paused/archived state; class publication remains per generated class.
  - B. Schedule state directly controls visibility of all generated classes.
  - C. Schedules have no status; only generated classes have status.
- Recommendation: A. It keeps operational schedule state separate from class visibility while giving managers control over generation.
- Answer: Derived from prior decisions as A. Rolling generation requires an active/runnable schedule state; Q5 already introduced cancelling/archiving as stopping future generation; the parent spec already separates class publication status, lifecycle status, and visibility. Therefore schedule status must control schedule operation only, while class publication remains per generated class.
- Answer impact: Resolves branch
- Spec impact: The spec now defines schedule statuses as `draft`, `active`, `paused`, and `archived`, and states that schedule state controls rolling generation only. Generated classes keep their own `status` and `lifecycle_status`.
- Context impact: Not needed. Status values are schema/lifecycle policy; `Schedule` and `Class` already exist in `CONTEXT.md`.
- ADR impact: Not needed separately. This follows from the rolling-generation and class-state decisions rather than introducing a new hard-to-reverse tradeoff.
- Follow-ups: None.

### Question 8: Template edits after generation

- Status: Answered
- Branch type: Dependency
- Why it matters: Template schemas can change after classes exist. Generated class custom data and future schedule generation need a migration rule.
- Scenario probe: A manager removes the `instructor` custom field from a template after several future classes have values and registrations. Should existing class data be preserved, hidden, deleted, or marked legacy?
- Options:
  - A. Template edits affect future generation; existing generated classes preserve their copied data and schema snapshot unless explicitly migrated.
  - B. Template edits immediately apply to all generated classes.
  - C. Templates cannot remove/change fields once used by generated classes.
- Recommendation: A. It preserves history and avoids blocking managers, while keeping explicit migration as a later capability.
- Answer: A, derived from Question 2. Template edits affect future generated classes only. Existing generated classes preserve the copied data values they had when they became concrete.
- Answer impact: Resolves branch
- Spec impact: The spec now treats generated classes as snapshots of template values plus schedule time placement at the moment of generation.
- Context impact: Not needed. `Class` already carries the concrete-record meaning; no separate glossary term is needed.
- ADR impact: Created ADR 0002 as part of the broader schedule/materialization decision.
- Follow-ups: None.

### Question 9: Generation horizon and manifestation timing

- Status: Answered
- Branch type: Follow-up
- Why it matters: Rolling explicit generation is resolved, but the system still needs to decide when concrete classes are created and how far into the future the backend keeps them materialized.
- Scenario probe: A manager creates a Sunday 20:00 schedule from Template 1. Users need to see upcoming classes without the manager manually creating each one. The backend must decide whether to create the next 4, 8, 12, or configured weeks, and when it extends that window.
- Options:
  - A. Product default horizon with per-schedule override, such as default 8 weeks and manager can choose 4/8/12/16 weeks.
  - B. Fixed global horizon for v1, such as always keep 8 weeks generated.
  - C. Generate through the schedule end date whenever the schedule is activated.
- Recommendation: Revised to A-light during discussion: product-level horizon for v1, default 8 weeks, with schedule-level override reserved for later.
- Answer: Use a product-level generation horizon for v1, defaulting to 8 weeks. This supports rolling explicit generation without requiring managers to configure every schedule. Schedule-level horizon overrides can be added later if needed.
- Answer impact: Changes model
- Spec impact: The spec now defines `Generation Horizon` as a product-level v1 setting. Active schedules keep concrete future classes materialized inside that horizon. The backend extends the horizon periodically or on manager-triggered refresh, and new classes use current template values when manifested.
- Context impact: Updated `CONTEXT.md` with `Generation Horizon`, because this is now canonical schedule-system language.
- ADR impact: Created ADR 0002 as part of the rolling-generation decision.
- Follow-ups: Need to decide recurrence scope and timezone behavior before the rolling-generation ADR can be written.

### Question 10: Default publication state for generated classes

- Status: Answered
- Branch type: Pressure-test
- Why it matters: We separated schedule operation from class publication, but rolling generation only creates a polished product if generated classes become user-facing without the manager manually publishing every occurrence. The class status default must be explicit.
- Scenario probe: Eden activates a Sunday 20:00 schedule. The backend manifests the next 8 weeks of classes. Should users immediately see/register for those generated classes, or should the manager manually publish each generated class first?
- Options:
  - A. Active schedules generate published classes by default; draft schedules preview only and do not materialize user-facing classes.
  - B. Active schedules generate draft classes by default; managers manually publish generated classes.
  - C. Template controls generated class publication default, so some templates generate draft classes and others generate published classes.
- Recommendation: A for v1. It matches the purpose of rolling generation and avoids turning every generated occurrence into manual publishing work. Managers can still edit/cancel/hide individual generated classes after they exist.
- Answer: A.
- Answer impact: Resolves branch
- Spec impact: The spec now states that draft schedules preview only, while active schedules generate published classes by default. Generated classes still carry their own visibility, registration policy, membership requirement, and lifecycle state.
- Context impact: Not needed. This is schema/default behavior using existing `Schedule` and `Class` terms.
- ADR impact: Created ADR 0002 as part of the rolling-generation decision.
- Follow-ups: None.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle and interruption, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, sequencing, and user review points.
- Result: The live agenda plus pressure-test branch resolved the schedule lifecycle. The final design covers rolling materialization, template read-only placement, generated class snapshots, skipped dates, schedule cancellation, schedule status, product-level generation horizon, v1 recurrence scope, timezone behavior, and generated class publication defaults.
- Remaining non-blocking risks:
  - Implementation must choose the exact backend trigger for horizon extension: scheduled job, manager-triggered refresh, or both.
  - Implementation must define idempotency keys/constraints for generated class uniqueness.
  - UI planning must decide how managers inspect generated classes and explicit schedule-cancellation choices.
