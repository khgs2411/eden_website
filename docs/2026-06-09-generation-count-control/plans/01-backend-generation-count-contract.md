# Chunk 01: Backend Generation Count Contract

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-frontend-generation-count-control.md`

## Goal

Extend the backend generation contract so `schedule-generate` accepts a validated `generation_count` and passes it to the canonical count-aware RPC signature that processes up to that many candidate occurrences per active schedule, while preserving existing defaults, permissions, idempotency, schedule validation, skipped-date behavior, and response shape.

## Source Artifacts

- Spec: Technical Design, Backend, Edge Function, Error Handling, Acceptance Criteria.
- Agenda: Questions 1 through 4.
- Context terms: Product, Manager, Schedule, Generation Horizon, Class.
- Existing code:
  - `backend/supabase/migrations/20260607153000_schedule_generation_engine.sql`
  - `backend/supabase/functions/schedule-generate/index.ts`
  - `backend/supabase/functions/schedules/index.ts`

## Relationships

- **Depends on:** existing schedule generation migration and Edge Function.
- **Enables:** frontend package UI can safely send `generation_count`.
- **Shared contracts:** `generation_count`, `p_generation_count`, valid integer range `1..52`, decimal integer strings only, unchanged response counts, and one count-aware RPC implementation path.
- **Integration points:** Supabase migrations, service-role-only RPC, Edge Function request validation, schedule activation generation path.

## File Responsibility Map

**Create:**
- `backend/supabase/migrations/<timestamp>_schedule_generation_count.sql` - create the count-aware three-argument RPC, replace the old two-argument body with a delegating compatibility wrapper, and keep grants service-role-only.

**Modify:**
- `backend/supabase/functions/schedule-generate/index.ts` - parse and validate `generation_count`; pass `p_generation_count`.
- `backend/supabase/functions/schedules/index.ts` - update internal schedule activation generation to call the three-argument RPC with `p_generation_count: null`.

**Test:**
- Backend SQL/Edge Function smoke through local Supabase CLI and curl.

## Implementation Tasks

### Task 1: Create the backend migration

**Files:**
- Create: `backend/supabase/migrations/<timestamp>_schedule_generation_count.sql`

- [ ] **Step 1: Generate a migration from the backend folder**

Run from `backend/`:

```bash
rtk npm run supabase:migrations
rtk supabase migration new schedule_generation_count
```

Expected: Supabase creates a new timestamped migration under `backend/supabase/migrations/`.

- [ ] **Step 2: Replace the generation function with a count-aware version**

Use this migration body as the implementation contract. Preserve tabs/formatting style consistent with existing SQL migrations if touching the generated file manually.

```sql
create or replace function public.generate_schedule_classes(
	p_product_id uuid,
	p_schedule_id uuid default null,
	p_generation_count integer default null
)
returns table(created_count integer, existing_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_generation_count integer;
begin
	select coalesce(p_generation_count, generation_horizon_weeks, 8)
		into v_generation_count
	from public.products
	where id = p_product_id
		and status = 'active';

	if v_generation_count is null then
		raise exception 'product_not_found';
	end if;

	if v_generation_count < 1 or v_generation_count > 52 then
		raise exception 'invalid_generation_count';
	end if;

	if p_schedule_id is not null and not exists (
		select 1
		from public.schedules s
		where s.id = p_schedule_id
			and s.product_id = p_product_id
	) then
		raise exception 'schedule_not_found';
	end if;

	return query
	with active_schedules as (
		select
			s.*,
			t.name as template_name,
			t.description,
			t.category,
			t.default_capacity,
			t.default_location,
			t.default_visibility,
			t.default_registration_policy,
			t.default_membership_requirement,
			t.default_notes,
			t.custom_defaults
		from public.schedules s
		join public.class_templates t on t.id = s.template_id and t.product_id = s.product_id
		where s.product_id = p_product_id
			and s.status = 'active'
			and (p_schedule_id is null or s.id = p_schedule_id)
			and t.status = 'active'
	),
	candidate_dates as (
		select active_schedules.*, d::date as class_date
		from active_schedules
		cross join lateral generate_series(
			greatest(active_schedules.starts_on, current_date),
			coalesce(active_schedules.ends_on, (current_date + '1 year'::interval)::date),
			interval '1 day'
		) d
		where (
			active_schedules.recurrence_type = 'one_time'
			and d::date = active_schedules.starts_on
		) or (
			active_schedules.recurrence_type = 'weekly'
			and extract(dow from d)::integer = any(active_schedules.weekdays)
		)
	),
	ranked_candidate_dates as (
		select
			cd.*,
			row_number() over (partition by cd.id order by cd.class_date) as occurrence_number
		from candidate_dates cd
	),
	limited_candidate_dates as (
		select *
		from ranked_candidate_dates
		where occurrence_number <= v_generation_count
	),
	filtered_dates as (
		select lcd.*
		from limited_candidate_dates lcd
		where not exists (
			select 1
			from public.schedule_skips ss
			where ss.product_id = lcd.product_id
				and ss.schedule_id = lcd.id
				and ss.skip_date = lcd.class_date
		)
	),
	skipped as (
		select count(*)::integer as count
		from limited_candidate_dates lcd
		where exists (
			select 1
			from public.schedule_skips ss
			where ss.product_id = lcd.product_id
				and ss.schedule_id = lcd.id
				and ss.skip_date = lcd.class_date
		)
	),
	resolved_dates as (
		select
			fd.*,
			((fd.class_date::text || ' ' || fd.start_time::text)::timestamp at time zone fd.timezone) as resolved_starts_at,
			(((fd.class_date::text || ' ' || fd.start_time::text)::timestamp + (fd.duration_minutes || ' minutes')::interval) at time zone fd.timezone) as resolved_ends_at
		from filtered_dates fd
	),
	existing_before as (
		select count(*)::integer as count
		from resolved_dates rd
		join public.classes c
			on c.product_id = rd.product_id
			and c.schedule_id = rd.id
			and c.generated_for_date = rd.class_date
			and c.starts_at = rd.resolved_starts_at
	),
	inserted as (
		insert into public.classes (
			product_id,
			template_id,
			schedule_id,
			generated_for_date,
			source_timezone,
			name,
			description,
			category,
			starts_at,
			ends_at,
			capacity,
			location,
			status,
			lifecycle_status,
			visibility,
			registration_policy,
			membership_requirement,
			notes,
			custom_data
		)
		select
			rd.product_id,
			rd.template_id,
			rd.id,
			rd.class_date,
			rd.timezone,
			rd.template_name,
			rd.description,
			rd.category,
			rd.resolved_starts_at,
			rd.resolved_ends_at,
			rd.default_capacity,
			rd.default_location,
			'published',
			'created',
			rd.default_visibility,
			rd.default_registration_policy,
			rd.default_membership_requirement,
			rd.default_notes,
			rd.custom_defaults
		from resolved_dates rd
		on conflict on constraint classes_generated_unique do nothing
		returning 1
	)
	select
		coalesce((select count(*)::integer from inserted), 0),
		coalesce((select count from existing_before), 0),
		coalesce((select count from skipped), 0);
end;
$$;

create or replace function public.generate_schedule_classes(
	p_product_id uuid,
	p_schedule_id uuid default null
)
returns table(created_count integer, existing_count integer, skipped_count integer)
language sql
security definer
set search_path = public
as $$
	select *
	from public.generate_schedule_classes(p_product_id, p_schedule_id, null::integer);
$$;

revoke all on function public.generate_schedule_classes(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.generate_schedule_classes(uuid, uuid) from public, anon, authenticated;
grant execute on function public.generate_schedule_classes(uuid, uuid, integer) to service_role;
grant execute on function public.generate_schedule_classes(uuid, uuid) to service_role;
```

Implementation note: Postgres keeps function overloads by argument identity. Do not leave the old two-argument PL/pgSQL body in place. This migration must replace it with the SQL wrapper above so old service-role callers delegate to the count-aware implementation, while repo-owned callers move to the three-argument call.

### Task 2: Update the Edge Function request parser

**Files:**
- Modify: `backend/supabase/functions/schedule-generate/index.ts`

- [ ] **Step 1: Add `generation_count` to the request type**

```ts
type GenerateRequest = {
	[key: string]: unknown;
	product_key?: string;
	schedule_id?: string | null;
	generation_count?: number | string | null;
};
```

- [ ] **Step 2: Add a parser near `optionalScheduleId`**

```ts
function optionalGenerationCount(value: unknown): number | null {
	if (value === undefined || value === null) {
		return null;
	}

	let parsed: number;

	if (typeof value === "number") {
		parsed = value;
	} else if (typeof value === "string") {
		const trimmed = value.trim();
		if (!/^(?:[1-9]\d*)$/.test(trimmed)) {
			throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
		}
		parsed = Number(trimmed);
	} else {
		throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
	}

	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
		throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
	}

	return parsed;
}
```

- [ ] **Step 3: Pass the parsed count to the RPC**

```ts
const generationCount = optionalGenerationCount(body.generation_count);
```

Then update the RPC call:

```ts
const { data, error } = await supabase.rpc("generate_schedule_classes", {
	p_product_id: ctx.product.id,
	p_schedule_id: scheduleId,
	p_generation_count: generationCount,
});
```

- [ ] **Step 4: Preserve existing error mapping**

Add invalid count handling only if the RPC can surface it despite Edge Function validation:

```ts
if (error.message.includes("invalid_generation_count")) {
	throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
}
```

Keep existing `schedule_not_found` mapping and generic internal error handling.

### Task 3: Update internal schedule activation generation

**Files:**
- Modify: `backend/supabase/functions/schedules/index.ts`

- [ ] **Step 1: Update `generateForActiveSchedule` to use the canonical three-argument RPC**

Replace the current two-argument RPC call with:

```ts
const { data, error } = await supabase.rpc("generate_schedule_classes", {
	p_product_id: productId,
	p_schedule_id: schedule.id,
	p_generation_count: null,
});
```

This update is mandatory. The two-argument SQL overload is retained only as a compatibility wrapper and should not be used by repo-owned runtime paths.

## Verification

- Run from `backend/`: `rtk npm run supabase:reset`
  - Expected: local database resets and the new migration applies without errors.
- Run from `backend/`: `rtk npm run supabase:db-lint`
  - Expected: no fatal lint failures from the new migration.
- Verify overload handling after reset:

```bash
PGPASSWORD=postgres rtk psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select proname, pg_get_function_identity_arguments(oid) as args from pg_proc where pronamespace = 'public'::regnamespace and proname = 'generate_schedule_classes' order by args;"
```

Expected: exactly two rows, one for `p_product_id uuid, p_schedule_id uuid` and one for `p_product_id uuid, p_schedule_id uuid, p_generation_count integer`; the two-argument function is the delegating wrapper from the migration, not the old horizon-week PL/pgSQL body.

```bash
PGPASSWORD=postgres rtk psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select pg_get_functiondef('public.generate_schedule_classes(uuid, uuid)'::regprocedure);"
```

Expected: the output contains `public.generate_schedule_classes(p_product_id, p_schedule_id, null::integer)`.
- Run from `backend/`: `rtk npm run supabase:functions`
  - Expected: Edge Functions serve locally.
- Curl invalid count:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","schedule_id":"<active-schedule-id>","generation_count":0}' http://127.0.0.1:54321/functions/v1/schedule-generate
```

Expected: HTTP 400 with `bad_request`.

- Curl surprising string formats:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","schedule_id":"<active-schedule-id>","generation_count":"1e1"}' http://127.0.0.1:54321/functions/v1/schedule-generate
```

Expected: HTTP 400 with `bad_request`.

- Curl valid count:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","schedule_id":"<active-schedule-id>","generation_count":3}' http://127.0.0.1:54321/functions/v1/schedule-generate
```

Expected: HTTP 200 with `{ "data": { "created_count": <0-3>, "existing_count": <0-3>, "skipped_count": <0-3> }, "error": null }` or the repo's current wrapped success shape.

- Repeat the valid curl.
  - Expected: no duplicate classes; newly created count should drop to 0 for the same occurrence set and existing count should reflect already generated rows.

## Acceptance Criteria Covered

- `schedule-generate` accepts and validates `generation_count`.
- RPC uses the requested count.
- Default remains 8 when omitted.
- Manager-only Edge Function boundary remains intact.
- Existing idempotency and generated class snapshot behavior remains intact.

## Risks And Rollback

- Risk: Leaving the old two-argument RPC body intact can preserve stale horizon-week behavior. The migration must replace it with the delegating wrapper and `schedules/index.ts` must call the three-argument contract.
- Risk: A one-year generated series cap may not find 52 occurrences for sparse future schedules. That is acceptable for weekly/one-time v1 schedules, but implementers should not expand beyond one year without a product decision.
- Rollback: revert the new migration and Edge Function changes; generation returns to product default horizon behavior.

## Non-Goals

- No product settings UI.
- No schedule-level stored default.
- No direct frontend RPC/table access.
- No registration or attendance changes.

## Type And Name Consistency

Use `generation_count` for JSON, `generationCount` for TypeScript local variables, and `p_generation_count` for SQL RPC parameters.
