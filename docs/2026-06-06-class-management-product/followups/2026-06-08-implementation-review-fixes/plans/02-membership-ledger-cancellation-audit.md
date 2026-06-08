# Chunk 02: Membership Ledger Cancellation Audit

**Plan Set:** `../plan.md`
**Spec:** `../../../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-security-rls-membership-visibility.md`
**Enables:** final verification

## Goal

Make membership cancellation auditing complete for all membership modes. Every membership-backed cancellation path must write a Membership Ledger row when `membership_grant_id` is present, with positive stock deltas only when stock is actually restored and `stock_delta = 0` for non-stock or pending/no-stock cases.

## Source Artifacts

- Root spec: Memberships, Registration + Membership Interaction.
- Agenda decisions: membership stock restoration, membership ledger event types.
- Context terms: Member, Membership Ledger.
- Review finding: 3 in `../../../reviews/2026-06-08/implementation-review.md`.
- Code paths: `supabase/migrations/20260607160000_registration_engine.sql`, `supabase/functions/register-class/index.ts`, `supabase/functions/manage-registrations/index.ts`, `supabase/functions/classes/index.ts`.

## Relationships

- **Depends on:** Chunk 01 active-membership helper/privilege contract completed.
- **Enables:** final smoke checks can assert complete membership audit history.
- **Shared contracts:** `registration_cancelled` and `class_cancelled_restore` ledger event names; stock restoration creates positive stock delta only when stock changes.
- **Integration points:** `cancel_class_registration`, `manage_class_registration`, `restore_class_cancelled_registrations`, `membership_ledger`.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_membership_cancellation_audit.sql` - replaces cancellation helper/RPC behavior with complete ledger events.

**Modify:**
- No Edge Function changes expected unless RPC return shape changes. Preserve existing function names and response shapes.

**Test:**
- SQL smoke checks through `rtk supabase db query`.
- Edge Function smoke through `register-class`, `manage-registrations`, and `classes` cancellation when JWTs are available.

## Implementation Tasks

### Task 1: Add cancellation audit migration

**Files:**
- Create: `supabase/migrations/<generated>_membership_cancellation_audit.sql`

- [ ] Run:

```bash
rtk supabase migration new membership_cancellation_audit
```

Expected: a migration file path under `supabase/migrations/`.

- [ ] Add this replacement helper and dependent functions to the generated migration:

```sql
create or replace function private.write_registration_cancellation_ledger(
	p_registration public.class_registrations,
	p_event_type text,
	p_created_by uuid,
	p_metadata jsonb default '{}'::jsonb,
	p_restore_stock boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_stock_delta integer := 0;
begin
	if p_registration.membership_grant_id is null then
		return;
	end if;

	if p_restore_stock and p_registration.stock_consumed > 0 then
		update public.membership_grants
		set remaining_stock = remaining_stock + p_registration.stock_consumed
		where id = p_registration.membership_grant_id
			and product_id = p_registration.product_id;

		v_stock_delta := p_registration.stock_consumed;
	end if;

	insert into public.membership_ledger (
		product_id,
		user_id,
		membership_grant_id,
		event_type,
		stock_delta,
		class_id,
		registration_id,
		metadata,
		created_by
	)
	values (
		p_registration.product_id,
		p_registration.user_id,
		p_registration.membership_grant_id,
		p_event_type,
		v_stock_delta,
		p_registration.class_id,
		p_registration.id,
		p_metadata || jsonb_build_object('stock_restored', v_stock_delta),
		p_created_by
	);
end;
$$;

create or replace function private.restore_registration_stock(
	p_registration public.class_registrations,
	p_event_type text,
	p_created_by uuid,
	p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
	perform private.write_registration_cancellation_ledger(
		p_registration,
		p_event_type,
		p_created_by,
		p_metadata,
		true
	);
end;
$$;
```

- [ ] Replace `public.cancel_class_registration` so it writes a ledger row for every membership-backed cancellation:

```sql
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
	v_should_restore boolean;
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
```

- [ ] Replace only the `cancel` branch in `public.manage_class_registration` with this behavior while preserving the existing `approve` and `reject` behavior:

```sql
-- Inside public.manage_class_registration, replace the p_action = 'cancel' branch with:
if p_action = 'cancel' then
	if v_registration.status not in ('pending', 'approved') then
		raise exception 'registration_not_cancellable';
	end if;

	perform private.write_registration_cancellation_ledger(
		v_registration,
		'registration_cancelled',
		p_created_by,
		jsonb_build_object('cancelled_by', 'manager'),
		v_registration.status = 'approved'
			and v_registration.stock_consumed > 0
			and v_class.starts_at > now()
	);

	update public.class_registrations
	set status = 'cancelled',
		cancelled_at = now()
	where id = v_registration.id
	returning * into v_registration;

	return v_registration;
end if;
```

- [ ] Replace `public.restore_class_cancelled_registrations` so it writes `class_cancelled_restore` ledger rows for every membership-backed registration, with stock restoration only where stock was consumed:

```sql
create or replace function public.restore_class_cancelled_registrations(
	p_product_id uuid,
	p_class_id uuid,
	p_created_by uuid default auth.uid()
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_registration public.class_registrations;
	v_restored_count integer := 0;
	v_should_restore boolean;
begin
	for v_registration in
		select *
		from public.class_registrations
		where product_id = p_product_id
			and class_id = p_class_id
			and status in ('pending', 'approved')
		for update
	loop
		v_should_restore := v_registration.status = 'approved'
			and v_registration.stock_consumed > 0;

		perform private.write_registration_cancellation_ledger(
			v_registration,
			'class_cancelled_restore',
			p_created_by,
			jsonb_build_object('class_cancelled', true),
			v_should_restore
		);

		if v_should_restore then
			v_restored_count := v_restored_count + 1;
		end if;

		update public.class_registrations
		set status = 'cancelled',
			cancelled_at = now()
		where id = v_registration.id;
	end loop;

	return v_restored_count;
end;
$$;
```

- [ ] Revoke direct client access to the new helper:

```sql
revoke all on function private.write_registration_cancellation_ledger(public.class_registrations, text, uuid, jsonb, boolean) from public, anon, authenticated;
```

## Verification

- Run: `rtk supabase status`
  - Expected: local Supabase stack is running, or reports it must be started.

- Run: `rtk supabase db lint`
  - Expected: no fatal findings.

- Run a focused non-destructive SQL inspection:

```bash
rtk supabase db query "select proname from pg_proc join pg_namespace n on n.oid = pg_proc.pronamespace where n.nspname = 'private' and proname = 'write_registration_cancellation_ledger';"
```

Expected: one row with `proname = write_registration_cancellation_ledger`.

- With local seeded test data or after an approved reset, verify:
  - cancelling an infinite/limited membership-backed registration writes a `registration_cancelled` ledger row with `stock_delta = 0`
  - cancelling a stock-backed approved registration before class start writes `registration_cancelled` with positive `stock_delta`
  - manager class cancellation writes `class_cancelled_restore` for every membership-backed registration, with positive `stock_delta` only for consumed stock

- Run: `npm run lint`
  - Expected: pass. No TypeScript changes are expected in this chunk.

- Run: `npm run build`
  - Expected: pass. Existing Vite chunk-size warning is acceptable.

## Acceptance Criteria Covered

- Membership Ledger records every membership-backed action.
- Stock restoration is recorded in the ledger.
- Non-stock membership actions are audited with `stock_delta = 0`.

## Risks And Rollback

- Duplicate ledger writes can occur if this chunk adds a new ledger insert without replacing the old restoration insert. Replace the helper/function bodies rather than adding parallel inserts.
- Rollback by reverting the new migration before dependent verification/docs chunk runs.

## Non-Goals

- Changing registration policy semantics.
- Changing membership grant modes or upgrade rules.
- Changing UI display of ledger history.

## Type And Name Consistency

Use event names exactly: `registration_cancelled` and `class_cancelled_restore`. Do not introduce payment/accounting terminology.
