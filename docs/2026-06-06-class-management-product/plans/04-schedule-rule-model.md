# Chunk 04: Schedule Rule Model

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `03-template-class-core.md`
**Enables:** `05-schedule-generation-engine.md`, manager schedule UI

## Goal

Implement schedule records, recurrence rule storage, timezone-aware preview, skipped dates, and manager schedule CRUD without creating concrete classes. This chunk models schedules as read-only template placement.

## Source Artifacts

- Schedule spec: Schedule Design, Resolved v1 recurrence support, Resolved timezone behavior, Resolved template relationship.
- Schedule agenda: Questions 2, 3, 6, 7.
- ADR 0002.
- Context: Schedule, Class Template, Generation Horizon.

## Relationships

- **Depends on:** `class_templates` and class source contracts from Chunk 03.
- **Enables:** rolling materialization in Chunk 05.
- **Shared contracts:** `schedules`, `schedule_skips`, recurrence fields, `duration_minutes` representation, preview response shape.
- **Integration points:** manager Edge Functions, future generation RPC.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_schedule_rule_model.sql` - schedules and skip-date schema.
- `supabase/functions/schedules/index.ts` - manager schedule CRUD and preview endpoint.

**Modify:**
- `supabase/functions/_shared/context.ts` - reuse `requireProductManager` and shared response helpers from Chunk 02.

**Test:**
- SQL smoke tests for recurrence fields and product/template consistency.
- Edge Function smoke tests for preview and manager-only mutation.

## Implementation Tasks

### Task 1: Create schedule schema

- [ ] Run `supabase migration new schedule_rule_model`.
- [ ] Create `schedules` using `duration_minutes integer`, not `end_time`:

```sql
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  template_id uuid not null references public.class_templates(id) on delete restrict,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  recurrence_type text not null check (recurrence_type in ('one_time', 'weekly')),
  weekdays integer[] not null default '{}'::integer[],
  starts_on date not null,
  ends_on date,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.schedule_skips (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  skip_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (schedule_id, skip_date)
);
```
- [ ] Create `schedule_skips` with `schedule_id`, `skip_date`, reason/notes, audit fields.
- [ ] Add constraints that schedule/template/product IDs match.
- [ ] Enable RLS and manager-only mutation policies.

### Task 2: Implement schedule CRUD and preview

- [ ] `schedules` Edge Function supports manager list/create/update/pause/archive and skip-date create/delete.
- [ ] Schedule create/update must verify:
  - template belongs to the same product
  - weekly recurrence has at least one valid weekday
  - one-time recurrence has exactly one intended date
  - timezone is provided.
- [ ] Preview endpoint accepts:

```json
{ "product_key": "eden", "schedule_id": "<schedule-uuid>", "from": "2026-07-01", "through": "2026-08-31" }
```

- [ ] Preview response:

```json
{ "data": { "occurrences": [{ "date": "2026-07-05", "local_start": "20:00:00", "starts_at": "2026-07-05T17:00:00Z", "ends_at": "2026-07-05T18:00:00Z", "timezone": "Asia/Jerusalem", "skipped": false }] }, "error": null }
```

### Task 3: Keep schedule read-only against templates

- [ ] Do not add schedule-level class defaults.
- [ ] Do not update template fields through schedule endpoints.
- [ ] Do not create or update concrete classes in this chunk.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
  - Expected: schedules and schedule_skips tables exist.
- Run manager preview smoke call for weekly Sunday 20:00 Asia/Jerusalem:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","schedule_id":"<schedule-id>","from":"2026-07-01","through":"2026-07-31"}' http://127.0.0.1:54321/functions/v1/schedules/preview
```

  - Expected: preview returns future Sunday occurrences and no class rows are inserted.
- Run user mutation smoke call.
  - Expected: 403.

## Acceptance Criteria Covered

- Managers can create schedules that place templates onto dates.
- V1 recurrence supports one-time and weekly selected weekdays.
- Schedule stores timezone and treats template as read-only.

## Risks And Rollback

- Timezone preview can drift if implemented in UTC terms. Verify local wall-clock behavior.
- Rollback by removing this migration/function before generation chunk runs.

## Non-Goals

- Rolling materialization into classes.
- User registration.
- Frontend schedule editor.

## Type And Name Consistency

Use `Schedule`, `Generation Horizon`, and `Class Template` as defined in `CONTEXT.md`.
