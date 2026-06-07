# Chunk 03: Template Class Core

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-product-role-foundation.md`, `02-edge-api-foundation.md`
**Enables:** `04-schedule-rule-model.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md`, `08-attendance-engine.md`

## Goal

Implement the core class model: class templates, typed custom field schema/defaults, concrete class records, final table/API naming, lifecycle/publication/visibility/policy fields, manager CRUD, and read APIs for concrete classes.

## Source Artifacts

- Root spec: Classes, Templates, and Schedules; Data / State Draft.
- Schedule spec: Template Design, Generated Class Inheritance.
- Context: Class Template, Class, Class Override.
- ADR 0002 snapshot decision.

## Relationships

- **Depends on:** product scoping and Edge Function role guards.
- **Enables:** schedule generation, registration, attendance, frontend class screens.
- **Shared contracts:** concrete class table name is `classes`, template schema JSON shape, class state enum values.
- **Integration points:** Edge Functions, transactional SQL/RPC helpers, future schedule source references.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_template_class_core.sql` - template and class schema.
- `supabase/functions/templates/index.ts` - manager template CRUD.
- `supabase/functions/classes/index.ts` - manager class CRUD and public/user class listing.

**Modify:**
- `supabase/functions/_shared/context.ts` - reuse `requireProductManager` and shared response helpers from Chunk 02.

**Test:**
- SQL smoke queries for constraints/RLS.
- Edge Function smoke calls for manager/user access.

## Implementation Tasks

### Task 1: Apply fixed table/API naming before schema work

- [ ] Use concrete table name `classes` for domain clarity, with `template_id` and `schedule_id` nullable source references.
- [ ] Record the choice in the chunk implementation notes or migration comments.
- [ ] Do not mix `class_occurrences` and `classes` in code.

### Task 2: Create template and class schema

- [ ] Run `supabase migration new template_class_core`.
- [ ] In the generated migration, use this DDL contract:

```sql
create table public.class_templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  description text,
  category text,
  default_capacity integer not null check (default_capacity > 0),
  default_location text,
  default_visibility text not null default 'public' check (default_visibility in ('public', 'hidden', 'members_only')),
  default_registration_policy text not null default 'member_auto_approve' check (default_registration_policy in ('auto_approve', 'member_auto_approve', 'approval_required')),
  default_membership_requirement text not null default 'none' check (default_membership_requirement in ('none', 'required')),
  default_notes text,
  custom_fields jsonb not null default '[]'::jsonb,
  custom_defaults jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  template_id uuid references public.class_templates(id) on delete set null,
  schedule_id uuid,
  generated_for_date date,
  source_timezone text,
  name text not null,
  description text,
  category text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  location text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  lifecycle_status text not null default 'created' check (lifecycle_status in ('created', 'cancelled', 'in_progress', 'completed')),
  visibility text not null default 'public' check (visibility in ('public', 'hidden', 'members_only')),
  registration_policy text not null default 'member_auto_approve' check (registration_policy in ('auto_approve', 'member_auto_approve', 'approval_required')),
  membership_requirement text not null default 'none' check (membership_requirement in ('none', 'required')),
  notes text,
  custom_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index class_templates_product_idx on public.class_templates(product_id);
create index classes_product_starts_idx on public.classes(product_id, starts_at);
create index classes_template_idx on public.classes(template_id);
create index classes_schedule_idx on public.classes(schedule_id);
```
- [ ] Add check constraints for all status/policy/visibility values.
- [ ] Add indexes for product/date listing and source references.

### Task 3: Add RLS, grants, and manager APIs

- [ ] Enable RLS on new tables.
- [ ] Managers can create/update templates and classes in their product.
- [ ] Users can list published/visible concrete classes according to product access.
- [ ] Hidden and member-only class filtering must be implemented in API logic, with RLS as defense in depth.
- [ ] Edge Functions must reject direct schedule/template registration attempts.

### Task 4: Implement template and class Edge Functions

- [ ] `templates` supports manager list/create/update/deactivate.
- [ ] `classes` supports manager list/create/update/cancel/publish and user/public listing of concrete classes.
- [ ] Validate custom field definitions against allowed field types: text, long text, number, boolean, select, multi-select, date, URL.
- [ ] Validate generated custom data against template required fields when creating a class from a template.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
  - Expected: template/class migration applies.
- Run: `supabase db lint`
  - Expected: no fatal errors.
- Run: `supabase db query "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name in ('schedule_id','generated_for_date','source_timezone') order by column_name;"`
  - Expected: three rows.
- Run manager API smoke:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","name":"Beginner Salsa","default_capacity":20,"custom_fields":[{"key":"level","label":"Level","type":"select","required":false,"options":["beginner","advanced"]}]}' http://127.0.0.1:54321/functions/v1/templates
```

  - Expected: 200 with `{ "data": { "template": ... }, "error": null }`.

## Acceptance Criteria Covered

- Managers can create templates.
- Classes carry global fields and custom data.
- Users register for concrete classes only.
- Class lifecycle/publication/visibility/policy state exists.

## Risks And Rollback

- JSON schema validation can be under-specified; keep allowed field types explicit.
- Rollback by dropping new template/class migration before dependent chunks run.

## Non-Goals

- Schedule recurrence/materialization.
- Memberships and registration.
- Attendance.
- Frontend UI.

## Type And Name Consistency

Use `Class Template` and `Class` glossary terms. Once table naming is chosen, keep it stable across all later chunks.
