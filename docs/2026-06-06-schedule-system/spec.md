# Schedule, Template, and Class Generation Design

Status: Final design pending user approval for implementation planning.

Date: 2026-06-06

Parent spec: `docs/2026-06-06-class-management-product/spec.md`

## Goal

Design the schedule system that lets a product manager define reusable class templates, place those templates on time, and produce concrete registerable classes without breaking the class, membership, product, and permission boundaries from the parent product spec.

This child spec owns the scheduling and template-to-class lifecycle. It may refine the class model where scheduling requires more precision, but it should not re-open the already settled multi-tenant, role, Edge Function, membership, or registration-policy decisions unless a schedule-specific conflict appears.

## Current Context

The parent product spec establishes three separate concepts:

- **Class Template**: product-scoped interface/schema that defines structured class data. It is not date-bound and users cannot register for it.
- **Schedule**: product-scoped time-management tool that places templates onto repeating or planned dates.
- **Class**: concrete date-bound offering that users can register for and that carries capacity, location, registration policy, lifecycle state, visibility, and attendance/registration state.

The parent spec intentionally deferred detailed schedule behavior, including recurrence, generation windows, duplicate prevention, and overrides.

The product architecture remains:

- One shared Supabase backend/project.
- Every table is product-scoped through `product_id`.
- Frontends call Edge Functions only.
- Edge Functions validate product key, allowed origin, JWT, and product-scoped role.
- Managers, not platform admins, operate templates, schedules, and classes.

## Working Vocabulary

This draft keeps the parent glossary names:

- A manager creates a **Class Template**.
- A manager creates a **Schedule** that references a template.
- The schedule produces concrete **Classes**.
- Users register for classes only.

One language correction: if we say "a schedule creates templates of classes", the precise model should be "a schedule creates classes from templates." Templates are authored by managers; schedules place those templates on time.

## Scope

In scope:

- Template authoring behavior needed by scheduling.
- Schedule creation and recurrence rules.
- Schedule-to-class generation lifecycle.
- Editing schedule rules after classes already exist.
- Per-class overrides for generated classes.
- Schedule cancellation and skipped dates.
- Duplicate prevention and idempotent generation.
- How generated classes inherit template defaults and schedule defaults.
- Manager-facing operational behavior for drafts, publishing, and refreshes.
- Acceptance boundaries for later implementation plans.

Out of scope:

- Payment or membership selling.
- Re-opening membership mode definitions.
- Re-opening registration policy semantics except where inherited defaults are needed.
- Full user-facing calendar UI design.
- Notifications and reminders.
- Waitlists.
- Instructor/resource conflict detection unless promoted from an agenda question.

## User-Facing Behavior

Managers should be able to:

- Create a class template with global defaults and product-specific custom fields.
- Create a schedule by choosing a template, recurrence pattern, date range, and timezone.
- Preview generated dates before concrete classes are published.
- Publish or generate concrete classes for a chosen date range.
- Edit a single generated class without mutating the template or whole schedule.
- Skip or cancel one generated class.
- Change a schedule and generate future classes without duplicating existing classes.
- Understand which classes came from which schedule/template.

Users should only see concrete classes that are published, visible to them, and still registerable under the parent spec's rules.

## Template Design

Templates are product-scoped schemas plus defaults. A template is not a recurring event and does not own class dates.

Template fields from the parent spec:

- stable key
- label
- type: text, long text, number, boolean, select, multi-select, date, URL
- required flag
- optional default value
- optional visibility/search flags

Template-level defaults may include:

- name
- description
- category
- capacity
- location
- visibility
- registration policy
- membership requirement
- notes
- custom field defaults

Resolved decision: templates own reusable class structure and defaults. If a manager wants to change default values for future generated classes, they change the template. The schedule reads the selected template; it does not alter template-defined class values.

## Schedule Design

A schedule is a manager-authored time-placement rule for one template.

Schedule fields:

- `product_id`
- `template_id`
- name/label
- status: `draft`, `active`, `paused`, `archived`
- timezone
- recurrence pattern
- recurrence start date
- optional recurrence end date
- audit fields

Resolved v1 recurrence support:

- one-time scheduled placement
- weekly recurrence
- one or more selected weekdays
- recurrence start date
- optional recurrence end date
- start time
- end time or duration
- timezone

More complex recurrence, such as monthly ordinal rules, holiday calendars, resource conflict detection, and exceptions imported from external calendars, is out of scope for v1.

Resolved timezone behavior:

- Schedules store recurrence in local wall-clock terms with an IANA timezone.
- Generated classes store absolute `starts_at` and `ends_at` timestamps.
- Generated classes also preserve the source timezone for audit/display/debugging.
- Weekly recurrence should preserve the manager's local intended time across daylight-saving changes. For example, Sunday 20:00 remains Sunday 20:00 in the schedule timezone even when the matching UTC timestamp shifts.
- Product-level timezone can provide the default timezone when managers create schedules, but the schedule stores the timezone used for generation.

Resolved schedule status model:

- `draft`: manager-authored schedule that can preview dates but does not run rolling generation.
- `active`: schedule participates in rolling generation and keeps future classes materialized inside its generation horizon.
- `paused`: schedule temporarily stops rolling generation without being retired.
- `archived`: schedule is retired and no longer generates future classes.

Schedule status controls schedule operation only. Generated classes keep their own class `status` (`draft`/`published`) and `lifecycle_status` (`created`/`cancelled`/`in_progress`/`completed`) from the parent spec. Users only see/register for concrete classes whose own class state allows it; schedule state does not directly publish or hide already generated classes.

Generated class publication default:

- Draft schedules preview dates only and do not materialize user-facing classes.
- Active schedules generate published classes by default.
- Generated classes still use their own class `visibility`, registration policy, membership requirement, and lifecycle rules.
- Managers can edit, hide, cancel, or otherwise manage individual generated classes after they exist.

Resolved template relationship:

- A schedule selects one template.
- The schedule treats the selected template as read-only source material.
- The schedule can place the template on time and define recurrence/generation behavior.
- The schedule cannot override class defaults such as capacity, location, visibility, registration policy, membership requirement, notes, or custom field defaults.
- Different defaults require a template change or a separate template.

## Generation Horizon

Rolling generation is bounded by a product-level generation horizon.

V1 behavior:

- Each product has a default generation horizon.
- The initial default should be 8 weeks.
- Active schedules keep concrete future classes materialized inside that horizon.
- The backend extends the horizon periodically or when a manager triggers a refresh/generation action.
- Newly generated classes use the current template values at the moment they become concrete.
- Existing generated classes are not rewritten when the horizon is refreshed.

Schedule-level horizon overrides are not part of v1. The schema can leave room for them later if real manager workflows need different exposure windows per schedule.

## Class Generation Model

The recommended working model is rolling explicit generation:

1. Manager creates or edits a template.
2. Manager creates a schedule for that template.
3. Manager previews dates generated by the schedule.
4. Manager activates the schedule with a generation horizon, such as "keep the next 8 weeks of classes materialized."
5. The backend creates or refreshes concrete published class rows idempotently inside that horizon.
6. Each generated class references `template_id` and `schedule_id`.
7. Users register for the generated class rows.

This draft recommends rolling explicit generation rather than pure virtual/lazy classes because concrete class rows are easier to register against, override, cancel, audit, and use with membership stock. The manager should not need to create every instance manually; the schedule should automatically keep concrete future classes available according to its generation horizon.

Resolved decision: schedules use rolling explicit generation. The manager activates the schedule once, and the backend keeps concrete future class rows materialized inside a configured horizon. This gives managers an automated schedule experience while preserving concrete classes for registration, capacity, attendance, overrides, cancellation, and membership stock.

## Generated Class Inheritance

Generated classes should copy the values needed to operate independently:

- template defaults
- schedule date/time placement
- product-level defaults, if later introduced

After a class is generated, it is a concrete object. Edits to the template or schedule do not rewrite existing generated classes automatically.

Refresh behavior:

- Rolling generation creates missing future classes inside the generation horizon.
- Rolling generation uses the current template values only when creating new classes.
- Existing generated classes keep the exact data values they had when they became concrete, plus any later manager edits to that class.
- Template changes affect future generated classes only.
- Schedule changes affect future generation and placement only.

Resolved decision: generated classes are snapshots, not live projections. Once a class exists, it is a concrete operational record. A manager can edit that class directly, but the schedule cannot change or alter an existing class instance.

## Overrides and Exceptions

A generated class should support per-class overrides:

- time/date adjustment
- capacity change
- location change
- status/lifecycle changes
- visibility change
- registration policy change
- membership requirement change
- custom data changes
- notes

A schedule should support exceptions:

- skip a date before class generation
- cancel an existing generated class
- detach or protect an overridden class from future schedule refreshes

Resolved cancellation and skip model:

- A schedule can record skipped dates before those dates are generated into classes.
- Cancelling an already generated class uses the class lifecycle status from the parent spec.
- Cancelling or archiving a schedule stops future rolling generation.
- Existing generated classes are not automatically cancelled just because the source schedule is cancelled or archived.
- When cancelling a schedule with existing future classes, the manager must explicitly choose what to do with those classes: leave them as concrete classes or cancel selected classes.

This keeps schedule state and class lifecycle separate. A schedule controls future generation; a class controls registration, attendance, cancellation, and membership restoration behavior after it exists.

## Permissions / Security

The parent permission model applies:

- Only product-scoped managers can create/update templates, schedules, and classes.
- Platform admins do not perform ordinary schedule/class management.
- Users cannot access operational schedule/template management.
- Every schedule, template, and class row is product-scoped.
- Edge Functions remain the application API.
- Postgres transactional logic should own idempotent class generation and duplicate prevention.

Schedule generation must prevent cross-product template/class creation even if a request supplies mismatched IDs.

## Error Handling and Edge Cases

Known edge cases to resolve through the agenda:

- Schedule recurrence generates a date where a class already exists.
- Manager edits a schedule after some generated classes have registrations.
- Manager edits a template after schedules and classes already exist.
- Manager changes timezone or daylight-saving boundary affects class times.
- Manager reduces capacity below existing approved registrations.
- Manager cancels a schedule with future generated classes.
- A generated class was manually edited and a later refresh wants to overwrite it.
- A schedule generates classes beyond its intended date range.
- Two managers refresh the same schedule concurrently.

## Testing Strategy

Later implementation plans should include:

- SQL/RPC tests for recurrence expansion and idempotent generation.
- Product-boundary tests for mismatched product/template/schedule/class IDs.
- Concurrency tests for duplicate prevention.
- Class override tests proving customized classes are not overwritten accidentally.
- Edge Function smoke tests for manager-only schedule actions.
- Registration smoke tests proving users can register only for concrete generated classes, not templates or schedules.

## Planning Boundary Guidance

Future planning should split this child spec into chunks:

1. Template schema and defaults: manager CRUD, validation, product scoping, custom field storage.
2. Schedule rule model: recurrence fields, preview, status, product scoping.
3. Class generation engine: explicit generation/refresh, idempotency, duplicate prevention, generated class references.
4. Overrides and exceptions: per-class edits, skipped dates, cancellation, snapshot preservation.
5. Manager frontend: template editor, schedule editor, preview/generate flow, generated class management.
6. Verification hardening: concurrency, timezone, product-boundary, and registration integration tests.

## Acceptance Criteria

- Managers can create templates that define class defaults and custom fields.
- Managers can create schedules that place templates onto dates.
- Schedules produce concrete class rows that users register for.
- Generated classes reference their source template and schedule.
- Per-class edits do not mutate the template or the full schedule.
- Refreshing a schedule does not create duplicates.
- Already registered classes are not silently rewritten in ways that break capacity, policy, or attendance.
- Schedule/template/class data remains product-scoped.
- Schedule operations are manager-only through Edge Functions.
- The design is specific enough for `$test-writing-plans` to split implementation into executable chunks.

## Assumptions

- A schedule references one template in v1.
- Users never register for schedules or templates.
- Generated classes can outlive their source schedule/template for audit and registration history.
- The parent spec's class fields remain the global class contract unless this child spec explicitly refines them.
- The parent spec's registration cutoff remains `starts_at` for v1.

## Open Questions

No live design questions remain. Decision history and pressure-test notes are tracked in `agenda.md`.
