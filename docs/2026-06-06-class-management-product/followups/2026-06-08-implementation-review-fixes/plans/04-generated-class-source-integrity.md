# Chunk 04: Generated Class Source Integrity

**Plan Set:** `../plan.md`
**Spec:** `../../../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** final verification

## Goal

Add integrity around generated class source metadata. A class that claims a `schedule_id` must reference an existing schedule in the same product, a generated class's `template_id` must match that source schedule, and ordinary manager class CRUD must not be able to forge generated-source fields that belong to the schedule generation path.

## Source Artifacts

- Root spec: Classes, Templates, and Schedules.
- Schedule child spec: Class Generation Model, Generated Class Inheritance, Overrides and Exceptions, Permissions / Security.
- ADR 0002: rolling schedule materialization.
- Context terms: Schedule, Class, Class Override, Generation Horizon.
- Review finding: 5 in `../../../reviews/2026-06-08/implementation-review.md`.
- Code paths: `supabase/migrations/20260607134535_template_class_core.sql`, `supabase/migrations/20260607143000_schedule_rule_model.sql`, `supabase/migrations/20260607153000_schedule_generation_engine.sql`, `supabase/functions/classes/index.ts`, `supabase/functions/schedule-generate/index.ts`.

## Relationships

- **Depends on:** current `classes`, `schedules`, and generation engine schema.
- **Enables:** reliable schedule/class source references for manager workflows and verification.
- **Shared contracts:** `template_id` is a product-scoped class/template association used by both manual and generated classes; generated provenance is the tuple of `template_id`, `schedule_id`, `generated_for_date`, and `source_timezone`; ordinary class overrides may edit class fields, but may not change generated provenance once `schedule_id` is present.
- **Integration points:** `classes` table, `schedules` table, class CRUD Edge Function, schedule generation RPC.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_generated_class_source_integrity.sql` - preflight-safe schema constraints for product-scoped templates, schedule references, and generated source consistency.

**Modify:**
- `supabase/functions/classes/index.ts` - prevent create/update requests from setting schedule-generation fields through ordinary class CRUD and prevent template changes on generated classes.

**Test:**
- SQL preflight and FK smoke checks through `rtk supabase db query`.
- Edge Function smoke for manager class create/update if JWTs are available.

## Implementation Tasks

### Task 1: Run preflight query before migration

**Files:**
- Inspect only before creating migration.

- [ ] Run:

```bash
rtk supabase db query "select c.id, c.product_id, c.schedule_id, c.template_id from public.classes c left join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and s.id is null;"
```

Expected: zero rows.

Then run:

```bash
rtk supabase db query "select c.id, c.product_id, c.schedule_id, c.template_id, s.template_id as schedule_template_id from public.classes c join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and c.template_id is distinct from s.template_id;"
```

Expected: zero rows.

Then check existing `template_id` product compatibility for the new composite template FK:

```bash
rtk supabase db query "select c.id, c.product_id, c.template_id from public.classes c left join public.class_templates t on t.id = c.template_id and t.product_id = c.product_id where c.template_id is not null and t.id is null;"
```

Expected: zero rows.

Then check generated source-field consistency for the new check constraint:

```bash
rtk supabase db query "select id, product_id, template_id, schedule_id, generated_for_date, source_timezone from public.classes where not ((schedule_id is null and generated_for_date is null and source_timezone is null) or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null));"
```

Expected: zero rows.

If any query returns rows, stop before adding FKs/checks and report the invalid class ids. The user must choose whether to null invalid source fields, repair referenced schedules/templates, or align generated class `template_id` values with their source schedules.

### Task 2: Add source integrity migration

**Files:**
- Create: `supabase/migrations/<generated>_generated_class_source_integrity.sql`

- [ ] Run:

```bash
rtk supabase migration new generated_class_source_integrity
```

Expected: a migration file path under `supabase/migrations/`.

- [ ] Add this SQL contract:

```sql
alter table public.classes
	drop constraint if exists classes_template_id_fkey;

alter table public.classes
	add constraint classes_template_product_fk
	foreign key (template_id, product_id)
	references public.class_templates(id, product_id)
	on delete set null (template_id);

alter table public.schedules
	add constraint schedules_id_template_product_unique
	unique (id, template_id, product_id);

alter table public.classes
	add constraint classes_schedule_product_fk
	foreign key (schedule_id, product_id)
	references public.schedules(id, product_id)
	on delete restrict;

alter table public.classes
	add constraint classes_generated_schedule_template_fk
	foreign key (schedule_id, template_id, product_id)
	references public.schedules(id, template_id, product_id)
	on delete restrict;

alter table public.classes
	add constraint classes_generated_source_consistency
	check (
		(schedule_id is null and generated_for_date is null and source_timezone is null)
		or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null)
	);
```

Use `restrict` for schedule FKs because generated classes must not silently lose their schedule provenance. Keep `classes_template_product_fk on delete set null (template_id)` so manual historical classes can outlive deleted templates without nulling `product_id`; generated classes still cannot lose `template_id` while `schedule_id` is present because schedules restrict template deletion and `classes_generated_source_consistency` requires `template_id`.

### Task 3: Guard ordinary class create/update source fields

**Files:**
- Modify: `supabase/functions/classes/index.ts`

- [ ] Update `ClassRow` so TypeScript knows the update path loaded generated-source state:

```ts
schedule_id: string | null;
```

- [ ] Add this helper near `rejectRegistrationAction`:

```ts
function rejectScheduleGeneratedSourceFields(body: ClassRequest): void {
	const sourceFields = ["schedule_id", "generated_for_date", "source_timezone"] as const;
	for (const field of sourceFields) {
		if (body[field] !== undefined) {
			throw new ApiError(
				400,
				"bad_request",
				`${field} is controlled by schedule generation.`,
			);
		}
	}
}
```

- [ ] In the `create` action, call the helper before building the insert:

```ts
rejectScheduleGeneratedSourceFields(body);
```

- [ ] Remove these properties from the ordinary create insert:

```ts
schedule_id: optionalUuidText(body.schedule_id, "schedule_id"),
generated_for_date: optionalIsoDate(body.generated_for_date, "generated_for_date"),
source_timezone: optionalText(body.source_timezone, "source_timezone"),
```

- [ ] In the `update` action, include `schedule_id` in the existing-class select:

```ts
.select("id,template_id,schedule_id,starts_at,ends_at,custom_data")
```

- [ ] In the `update` action, call the helper before constructing the update object:

```ts
rejectScheduleGeneratedSourceFields(body);
```

- [ ] In the `update` action, reject `template_id` changes for generated classes after loading `existingClass`:

```ts
if (body.template_id !== undefined && existingClass.schedule_id !== null) {
	throw new ApiError(
		400,
		"bad_request",
		"template_id is controlled by schedule generation for generated classes.",
	);
}
```

- [ ] Remove these update branches:

```ts
if (body.schedule_id !== undefined) update.schedule_id = optionalUuidText(body.schedule_id, "schedule_id");
if (body.generated_for_date !== undefined) update.generated_for_date = optionalIsoDate(body.generated_for_date, "generated_for_date");
if (body.source_timezone !== undefined) update.source_timezone = optionalText(body.source_timezone, "source_timezone");
```

- [ ] Keep `template_id` editable for manual classes only if the current product owns the template. The existing `loadTemplate(ctx.product.id, nextTemplateId)` path remains the product-ownership validation after the generated-class guard above.

## Verification

- Run: `rtk supabase status`
  - Expected: local Supabase stack is running, or reports it must be started.

- Run all four preflight queries from Task 1.
  - Expected before migration: zero rows for missing schedules, generated class/template mismatches, cross-product template references, and source-field consistency violations.

- Run: `rtk supabase db lint`
  - Expected: no fatal findings.

- Run: `rtk supabase db query "select conname from pg_constraint where conname in ('classes_template_product_fk','schedules_id_template_product_unique','classes_schedule_product_fk','classes_generated_schedule_template_fk','classes_generated_source_consistency') order by conname;"`
  - Expected after migration: five rows with all constraint names.

- Run: `rtk supabase db query "select c.id from public.classes c join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and c.template_id is distinct from s.template_id;"`
  - Expected after migration: zero rows.

- Run: `npm run lint`
  - Expected: pass with no unused helper/imports.

- Run: `npm run build`
  - Expected: pass. Existing Vite chunk-size warning is acceptable.

- Optional Edge Function smoke with manager JWT:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"create","name":"Manual class","starts_at":"2026-07-01T17:00:00Z","ends_at":"2026-07-01T18:00:00Z","capacity":10,"schedule_id":"00000000-0000-0000-0000-000000000000"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request` with a message that `schedule_id` is controlled by schedule generation.

Optional Edge Function smoke with manager JWT against an existing generated class:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"update","class_id":"<generated-class-id>","template_id":"<same-product-template-id>"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request` with a message that `template_id` is controlled by schedule generation for generated classes.

## Acceptance Criteria Covered

- Generated classes reference their source schedule in the same product.
- Generated class `template_id` matches the source schedule's `template_id`.
- Schedule/template/class data remains product-scoped.
- Per-class edits do not forge source metadata.
- Generated classes remain concrete snapshots.

## Risks And Rollback

- Existing invalid data can block the FK. Stop and report invalid rows instead of adding a destructive cleanup.
- `on delete restrict` can block deleting schedules that still have generated classes. That is intentional; schedule deletion must first resolve the dependent generated classes.
- Rollback by reverting the generated migration and class CRUD source-field rejection.

## Non-Goals

- Changing schedule generation logic.
- Adding schedule-level class defaults.
- Cancelling existing generated classes when schedules are archived.
- UI redesign for generated class inspection.

## Type And Name Consistency

Use `template_id`, `schedule_id`, `generated_for_date`, and `source_timezone` exactly. Do not reintroduce `class_occurrences`.
