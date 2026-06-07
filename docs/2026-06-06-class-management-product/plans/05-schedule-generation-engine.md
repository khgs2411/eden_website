# Chunk 05: Schedule Generation Engine

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `04-schedule-rule-model.md`
**Enables:** user-visible recurring class calendar, registration against generated classes

## Goal

Implement rolling explicit generation: active schedules materialize published concrete class rows inside the product-level 8-week Generation Horizon, with idempotency, timezone-safe timestamps, generated class snapshots, skip-date handling, and source references.

## Source Artifacts

- Schedule spec: Generation Horizon, Class Generation Model, Generated Class Inheritance, Overrides and Exceptions.
- Schedule agenda: Questions 1, 5, 9, 10.
- ADR 0002.
- Context: Generation Horizon, Class, Class Override.

## Relationships

- **Depends on:** schedules from Chunk 04 and classes/templates from Chunk 03.
- **Enables:** registration engine and user class discovery.
- **Shared contracts:** generated class source fields, idempotency key/constraint, generation RPC/API.
- **Integration points:** schedule manager API, class listing API, future frontend schedule activation.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_schedule_generation_engine.sql` - generated class source fields/constraints/RPCs if not already present.
- `supabase/functions/schedule-generate/index.ts` - manager-triggered horizon fill/refresh.

**Modify:**
- `supabase/functions/schedules/index.ts` - call generation when activating schedules if that is the chosen trigger.
- `supabase/functions/classes/index.ts` - expose generated source metadata to managers.

**Test:**
- SQL/RPC smoke tests for idempotency, skipped dates, DST/local time behavior.

## Implementation Tasks

### Task 1: Define generation ownership and idempotency

- [ ] Confirm `classes` contains exactly these generated source fields from Chunk 03: `template_id`, `schedule_id`, `generated_for_date`, `source_timezone`.
- [ ] Add this unique constraint:

```sql
alter table public.classes
  add constraint classes_generated_unique
  unique (product_id, schedule_id, generated_for_date, starts_at);
```
- [ ] Generated classes are published by default when schedule status is active.

### Task 2: Implement generation RPC

- [ ] Create a transactional function with this executable structure. The implementation may adjust syntax for Postgres, but must preserve the CTE shape, conflict target, snapshot insert columns, and count semantics:

```sql
create or replace function public.generate_schedule_classes(p_product_id uuid, p_schedule_id uuid default null)
returns table(created_count integer, existing_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horizon_weeks integer;
begin
  select generation_horizon_weeks
    into v_horizon_weeks
  from public.products
  where id = p_product_id
    and status = 'active';

  if v_horizon_weeks is null then
    raise exception 'product_not_found';
  end if;

  return query
  with active_schedules as (
    select s.*, t.name as template_name, t.description, t.category,
      t.default_capacity, t.default_location, t.default_visibility,
      t.default_registration_policy, t.default_membership_requirement,
      t.default_notes, t.custom_defaults
    from public.schedules s
    join public.class_templates t on t.id = s.template_id and t.product_id = s.product_id
    where s.product_id = p_product_id
      and s.status = 'active'
      and (p_schedule_id is null or s.id = p_schedule_id)
      and t.status = 'active'
  ),
  candidate_dates as (
    select s.*, d::date as class_date
    from active_schedules s
    cross join lateral generate_series(
      greatest(s.starts_on, current_date),
      least(coalesce(s.ends_on, current_date + (v_horizon_weeks || ' weeks')::interval), current_date + (v_horizon_weeks || ' weeks')::interval)::date,
      interval '1 day'
    ) d
    where (
      s.recurrence_type = 'one_time' and d::date = s.starts_on
    ) or (
      s.recurrence_type = 'weekly' and extract(isodow from d)::integer = any(s.weekdays)
    )
  ),
  filtered_dates as (
    select cd.*
    from candidate_dates cd
    where not exists (
      select 1
      from public.schedule_skips ss
      where ss.schedule_id = cd.id
        and ss.skip_date = cd.class_date
    )
  ),
  skipped as (
    select count(*)::integer as count
    from candidate_dates cd
    where exists (
      select 1
      from public.schedule_skips ss
      where ss.schedule_id = cd.id
        and ss.skip_date = cd.class_date
    )
  ),
  existing_before as (
    select count(*)::integer as count
    from filtered_dates fd
    join public.classes c
      on c.product_id = fd.product_id
     and c.schedule_id = fd.id
     and c.generated_for_date = fd.class_date
     and c.starts_at = ((fd.class_date::text || ' ' || fd.start_time::text)::timestamp at time zone fd.timezone)
  ),
  inserted as (
    insert into public.classes (
      product_id, template_id, schedule_id, generated_for_date, source_timezone,
      name, description, category, starts_at, ends_at, capacity, location,
      status, lifecycle_status, visibility, registration_policy, membership_requirement,
      notes, custom_data
    )
    select
      fd.product_id,
      fd.template_id,
      fd.id,
      fd.class_date,
      fd.timezone,
      fd.template_name,
      fd.description,
      fd.category,
      ((fd.class_date::text || ' ' || fd.start_time::text)::timestamp at time zone fd.timezone),
      (((fd.class_date::text || ' ' || fd.start_time::text)::timestamp + (fd.duration_minutes || ' minutes')::interval) at time zone fd.timezone),
      fd.default_capacity,
      fd.default_location,
      'published',
      'created',
      fd.default_visibility,
      fd.default_registration_policy,
      fd.default_membership_requirement,
      fd.default_notes,
      fd.custom_defaults
    from filtered_dates fd
    on conflict on constraint classes_generated_unique do nothing
    returning 1
  )
  select
    coalesce((select count(*)::integer from inserted), 0),
    coalesce((select count from existing_before), 0),
    coalesce((select count from skipped), 0);
end;
$$;
```

- [ ] The function implementation must:
  - load product generation horizon, default 8 weeks
  - expand active schedules within that horizon
  - exclude skipped dates
  - convert local wall-clock schedule time to absolute timestamps with `at time zone`
  - copy current template defaults into new class rows
  - never update existing classes
  - be idempotent when run repeatedly.

### Task 3: Implement Edge Function trigger

- [ ] `schedule-generate` requires product manager role.
- [ ] It can generate for one schedule or all active schedules in a product.
- [ ] It returns counts: `created_count`, `existing_count`, `skipped_count`.
- [ ] It does not expose direct table/RPC access to the frontend.

### Task 4: Choose v1 horizon extension trigger

- [ ] Implement manager-triggered generation now.
- [ ] If adding scheduled/cron generation in v1 is not supported locally, document that `13-local-verification-and-docs.md` will cover the manual smoke command.
- [ ] Do not add schedule-level horizon overrides in v1.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
- Run generation twice for the same active Sunday schedule:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","schedule_id":"<schedule-id>"}' http://127.0.0.1:54321/functions/v1/schedule-generate
```

  - Expected first run creates rows; second run reports existing rows and creates no duplicates.
- Query generated classes.
  - Expected `status = 'published'`, source references set, class values copied from template.
- Add a skip date and rerun.
  - Expected no class for skipped date.
- Test a DST boundary schedule in Asia/Jerusalem.
  - Expected local time remains stable; UTC timestamp shifts as needed.
- Run: `supabase db query "select count(*) from public.classes group by product_id, schedule_id, generated_for_date, starts_at having count(*) > 1;"`
  - Expected: zero rows.

## Acceptance Criteria Covered

- Schedules produce concrete class rows.
- Generated classes reference source template and schedule.
- Refreshing/generating does not create duplicates.
- Generated classes are snapshots and not rewritten.

## Risks And Rollback

- Highest-risk chunk: recurrence/timezone/idempotency. Require SQL smoke evidence before frontend integration.
- Rollback by removing generation function and migration constraints before registration depends on generated rows.

## Non-Goals

- Schedule CRUD/preview.
- Registration and membership.
- Frontend UI.

## Type And Name Consistency

Use `Generation Horizon`, `Schedule`, `Class`, and `Class Override` consistently. Do not call generated classes templates or schedule items.
