# Chunk 01: Backend Cancellation Cutoff

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-user-cancellation-cutoff-ui.md`

## Goal

Add the backend product setting and authoritative cutoff enforcement for user registration cancellation. This chunk must preserve existing membership cancellation ledger behavior and manager/class cancellation behavior.

## Source Artifacts

- Spec sections: Technical Design, Data / State, Permissions / Security, Error Handling, Testing Strategy.
- Agenda decisions: Questions 1, 2, and 3.
- Context term: **Cancellation Cutoff** in `CONTEXT.md`.
- Code paths:
  - `backend/supabase/migrations/20260608020000_membership_cancellation_audit.sql`
  - `backend/supabase/functions/register-class/index.ts`
  - `backend/supabase/functions/classes/index.ts`
  - `backend/package.json`

## Relationships

- **Depends on:** Current registration engine and membership cancellation audit migration.
- **Enables:** UI to render server-computed cancellation availability.
- **Shared contracts:** `registration_cancellation_cutoff_hours`, `can_cancel_registration`, `registration_cancellation_closed`.
- **Integration points:** Supabase migrations, `register-class` Edge Function, `classes` Edge Function, local SQL smoke.

## File Responsibility Map

**Create:**
- `backend/supabase/migrations/20260609110000_registration_cancellation_cutoff.sql` - add product cutoff setting and replace `public.cancel_class_registration(...)` with cutoff enforcement.

**Modify:**
- `backend/supabase/functions/register-class/index.ts` - map `registration_cancellation_closed` to a user-visible API error.
- `backend/supabase/functions/classes/index.ts` - include `registration_cancellation_cutoff_hours` and `can_cancel_registration` in user/public class summaries.

**Test / Verify:**
- No persistent test file required unless the repo already has SQL smoke scripts by implementation time.
- Use rollback-safe local SQL smoke through the local Supabase stack when available.

## Implementation Tasks

### Task 1: Add product cutoff setting and database enforcement

**Files:**
- Create: `backend/supabase/migrations/20260609110000_registration_cancellation_cutoff.sql`

- [ ] **Step 1: Before writing the migration, inspect the current latest `public.cancel_class_registration(...)` body**

Check whether another migration, especially registration rejection recovery, has already replaced registration functions. If yes, preserve the newer body and add only the cutoff logic described below.

Run:

```bash
grep -RIn "create or replace function public.cancel_class_registration" backend/supabase/migrations
```

Expected: one or more migration definitions. The implementation must base the new replacement on the latest applicable definition.

- [ ] **Step 2: Create the migration**

Use this migration shape, adjusting only if a newer function body exists by implementation time:

```sql
alter table public.products
add column if not exists registration_cancellation_cutoff_hours integer not null default 24;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'products_registration_cancellation_cutoff_hours_nonnegative'
	) then
		alter table public.products
		add constraint products_registration_cancellation_cutoff_hours_nonnegative
		check (registration_cancellation_cutoff_hours >= 0);
	end if;
end $$;

create or replace function public.cancel_class_registration(
	p_product_id uuid,
	p_registration_id uuid,
	p_user_id uuid,
	p_created_by uuid default auth.uid(),
	p_force_restore boolean default false
)
returns public.class_registrations
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_registration public.class_registrations;
	v_class public.classes;
	v_product public.products;
	v_should_restore boolean;
	v_cancel_cutoff_at timestamptz;
begin
	select *
	into v_registration
	from public.class_registrations
	where id = p_registration_id
		and product_id = p_product_id
		and user_id = p_user_id
		and status in ('pending', 'approved')
	for update;

	if not found then
		raise exception 'registration_not_found';
	end if;

	select *
	into v_class
	from public.classes
	where id = v_registration.class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	select *
	into v_product
	from public.products
	where id = p_product_id;

	if not found then
		raise exception 'product_not_found';
	end if;

	v_cancel_cutoff_at := v_class.starts_at - make_interval(hours => v_product.registration_cancellation_cutoff_hours);

	if not p_force_restore and now() >= v_cancel_cutoff_at then
		raise exception 'registration_cancellation_closed';
	end if;

	v_should_restore := v_registration.status = 'approved'
		and v_registration.stock_consumed > 0
		and (p_force_restore or v_class.starts_at > now());

	perform private.write_registration_cancellation_ledger(
		v_registration,
		'registration_cancelled',
		p_created_by,
		jsonb_build_object('force_restore', p_force_restore, 'cancelled_by', 'user'),
		v_should_restore
	);

	update public.class_registrations
	set status = 'cancelled',
		cancelled_at = now()
	where id = v_registration.id
	returning * into v_registration;

	return v_registration;
end;
$$;

revoke all on function public.cancel_class_registration(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.cancel_class_registration(uuid, uuid, uuid, uuid, boolean) to service_role;
```

- [ ] **Step 3: Preserve manager and class cancellation**

Do not change `public.manage_class_registration(...)`, `public.restore_class_cancelled_registrations(...)`, or `public.cancel_class_with_registration_restoration(...)` unless a newer migration forces a function-body merge. The user cutoff applies only to user cancellation.

### Task 2: Map the cutoff error in the user registration Edge Function

**Files:**
- Modify: `backend/supabase/functions/register-class/index.ts`

- [ ] **Step 1: Add `registration_cancellation_closed` to `toApiError`**

Add this branch before the generic internal error:

```ts
	if (message.includes("registration_cancellation_closed")) {
		return new ApiError(400, "bad_request", "Cancellation is closed for this class.");
	}
```

Keep the existing conflict, not-found, and bad-request mappings intact.

### Task 3: Expose server-computed cancellation availability from class listing

**Files:**
- Modify: `backend/supabase/functions/classes/index.ts`

- [ ] **Step 1: Ensure listed class rows can carry cutoff fields**

Add the response fields where class rows are mapped for `list_public` and `list_user`. The exact helper shape may differ; the contract is:

```ts
type ListedClassWithCancellation = ListedClassRow & {
	registration_cancellation_cutoff_hours: number;
	can_cancel_registration: boolean;
};
```

- [ ] **Step 2: Load product cutoff once per request**

In `list_public` and `list_user`, use the resolved product context's product row if it already includes `registration_cancellation_cutoff_hours`; otherwise query `products` by id and default defensively to `24` only if the column is absent during local transition.

The implementation should avoid adding per-class queries.

- [ ] **Step 3: Compute cutoff state with server time**

For each returned class:

```ts
const now = Date.now();
const cutoffHours = product.registration_cancellation_cutoff_hours ?? 24;
const cancelCutoffAt = Date.parse(classRow.starts_at) - cutoffHours * 60 * 60 * 1000;
const registration = registrationsByClassId.get(classRow.id) as { status?: string } | undefined;

return {
	...classRow,
	registration_cancellation_cutoff_hours: cutoffHours,
	can_cancel_registration: Boolean(registration && (registration.status === "pending" || registration.status === "approved") && now < cancelCutoffAt),
	user_registration: registration ?? null,
};
```

For public listing where no user registration exists, return `can_cancel_registration: false`.

If the project context helper already exposes a trusted server timestamp pattern, use that instead of `Date.now()`.

## Verification

Run from repository root:

```bash
git diff --check
```

Expected: exits 0.

Run from `backend/`:

```bash
rtk npm run supabase:migrations
```

Expected: migration list command exits 0 and includes the new migration after existing migrations.

When the local Supabase stack is available, run from `backend/`:

```bash
rtk npm run supabase:db-lint
```

Expected: exits 0, or only known unrelated lint warnings are recorded.

Run a local SQL smoke using the Supabase Postgres container or project-standard SQL runner:

- Set `products.registration_cancellation_cutoff_hours = 24`.
- Create or locate an active product user and a published class starting more than 24 hours in the future with a live registration.
- Call `public.cancel_class_registration(..., p_force_restore => false)`.
- Expected: registration becomes `cancelled`.
- Create or locate a comparable class starting within 24 hours with a live registration.
- Call `public.cancel_class_registration(..., p_force_restore => false)`.
- Expected: raises `registration_cancellation_closed`.
- Call the manager/class cancellation path where relevant.
- Expected: existing manager/class cancellation behavior is not newly blocked by the cutoff.

## Acceptance Criteria Covered

- Default cutoff is 24 hours.
- Cutoff value is product scoped and non-negative.
- Backend rejects stale/direct user cancellation after cutoff.
- Cutoff value 0 preserves old until-start cancellation behavior.
- Manager/class cancellation restoration behavior is unchanged.

## Risks And Rollback

- Risk: a parallel migration may also replace registration functions. Resolve by diffing the latest function body before implementation.
- Rollback: use a forward migration setting `registration_cancellation_cutoff_hours = 0` for affected products to restore old user-cancellation timing, or replace `cancel_class_registration` with the previous body if the whole feature is reverted.

## Non-Goals

- Per-class cancellation deadline fields.
- Registration open/close windows.
- Manager UI for editing the cutoff value.
- Changes to rejected-registration recovery.

## Type And Name Consistency

Use exactly:

- `registration_cancellation_cutoff_hours`
- `can_cancel_registration`
- `registration_cancellation_closed`
- `public.cancel_class_registration`
