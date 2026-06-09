# Chunk 01: Backend Registration Recovery

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-manager-recovery-ui.md`

## Goal

Add backend support for recovering rejected class registrations through manager-only actions: direct approval of a rejected registration and explicit allow-re-register recovery that preserves the rejected row as non-live history.

## Source Artifacts

- Spec sections: Backend Contract, Data / State, Permissions / Security, Error Handling
- Agenda decisions: Questions 1, 2, and 3
- Context term: Registration Rejection Recovery in `CONTEXT.md`
- Code paths:
  - `backend/supabase/migrations/20260608020000_membership_cancellation_audit.sql`
  - `backend/supabase/functions/manage-registrations/index.ts`
  - `backend/README.md`
  - `backend/SMOKE.md`

## Relationships

- **Depends on:** Existing registration engine and membership cancellation audit migration.
- **Enables:** Manager recovery UI actions.
- **Shared contracts:** `manage-registrations` actions `approve_rejected` and `allow_reregister`; `public.manage_class_registration(...)`; `{ data, error }` response wrapper.
- **Integration points:** Supabase migration runner, `manage-registrations` Edge Function, local Supabase smoke checks.

## File Responsibility Map

**Create:**

- `backend/supabase/migrations/20260609090000_registration_rejection_recovery.sql` - add rejection/recovery metadata and replace `public.manage_class_registration(...)` with rejected-registration recovery support.

**Modify:**

- `backend/supabase/functions/manage-registrations/index.ts` - add request action types, call the RPC with new actions, and map duplicate-live conflicts.

**Test / Verify:**

- `backend/SMOKE.md` - optionally add a short recovery smoke note if implementation wants durable manual verification instructions.

## Implementation Tasks

### Task 1: Add SQL Recovery Actions

**Files:**

- Create: `backend/supabase/migrations/20260609090000_registration_rejection_recovery.sql`

- [ ] **Step 1: Create the migration with the full replacement function**

Use this migration, preserving the existing cancellation ledger behavior and adding metadata-backed `approve_rejected` plus `allow_reregister`.

```sql
alter table public.class_registrations
	add column if not exists rejected_at timestamptz,
	add column if not exists rejected_by uuid references auth.users(id) on delete set null,
	add column if not exists rejection_recovered_at timestamptz,
	add column if not exists rejection_recovered_by uuid references auth.users(id) on delete set null,
	add column if not exists rejection_recovery_action text check (
		rejection_recovery_action is null
		or rejection_recovery_action in ('approve_rejected', 'allow_reregister')
	);

create or replace function public.manage_class_registration(
	p_product_id uuid,
	p_registration_id uuid,
	p_action text,
	p_created_by uuid default auth.uid()
)
returns public.class_registrations
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_registration public.class_registrations;
	v_class public.classes;
	v_stock_consumed integer := 0;
	v_has_live_replacement boolean := false;
begin
	if p_action not in ('approve', 'reject', 'cancel', 'approve_rejected', 'allow_reregister') then
		raise exception 'unsupported_registration_action';
	end if;

	select *
	into v_registration
	from public.class_registrations
	where id = p_registration_id
		and product_id = p_product_id
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

	if p_action = 'allow_reregister' then
		if v_registration.status <> 'rejected' then
			raise exception 'registration_not_rejected';
		end if;

		update public.class_registrations
		set rejection_recovered_at = now(),
			rejection_recovered_by = p_created_by,
			rejection_recovery_action = 'allow_reregister'
		where id = v_registration.id
		returning * into v_registration;

		return v_registration;
	end if;

	if p_action = 'reject' then
		if v_registration.status <> 'pending' then
			raise exception 'registration_not_pending';
		end if;

	update public.class_registrations
		set status = 'rejected',
			rejected_at = now(),
			rejected_by = p_created_by,
			rejection_recovered_at = null,
			rejection_recovered_by = null,
			rejection_recovery_action = null
	where id = v_registration.id
	returning * into v_registration;

		return v_registration;
	end if;

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

	if p_action = 'approve' and v_registration.status <> 'pending' then
		raise exception 'registration_not_pending';
	end if;

	if p_action = 'approve_rejected' and v_registration.status <> 'rejected' then
		raise exception 'registration_not_rejected';
	end if;

	select exists (
		select 1
		from public.class_registrations
		where product_id = p_product_id
			and class_id = v_registration.class_id
			and user_id = v_registration.user_id
			and id <> v_registration.id
			and status in ('pending', 'approved')
	)
	into v_has_live_replacement;

	if v_has_live_replacement then
		raise exception 'registration_live_replacement_exists';
	end if;

	perform private.ensure_class_registerable(v_class);

	if private.approved_registration_count(v_class.id) >= v_class.capacity then
		raise exception 'class_capacity_full';
	end if;

	if v_registration.membership_grant_id is not null then
		v_stock_consumed := private.consume_registration_stock(
			p_product_id,
			v_registration.user_id,
			v_registration.class_id,
			v_registration.id,
			v_registration.membership_grant_id,
			p_created_by
		);

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
			p_product_id,
			v_registration.user_id,
			v_registration.membership_grant_id,
			'class_registration',
			-v_stock_consumed,
			v_registration.class_id,
			v_registration.id,
			jsonb_build_object(
				'registration_status',
				'approved',
				'approved_by_manager',
				true,
				'recovered_from_rejection',
				p_action = 'approve_rejected'
			),
			p_created_by
		);
	end if;

	update public.class_registrations
	set status = 'approved',
		stock_consumed = v_stock_consumed,
		approved_at = now(),
		rejection_recovered_at = case when p_action = 'approve_rejected' then now() else rejection_recovered_at end,
		rejection_recovered_by = case when p_action = 'approve_rejected' then p_created_by else rejection_recovered_by end,
		rejection_recovery_action = case when p_action = 'approve_rejected' then 'approve_rejected' else rejection_recovery_action end
	where id = v_registration.id
	returning * into v_registration;

	return v_registration;
end;
$$;

revoke all on function public.manage_class_registration(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_class_registration(uuid, uuid, text, uuid) to service_role;
```

- [ ] **Step 2: Check migration visibility**

Run from `backend/`:

```bash
rtk npm run supabase:migrations
```

Expected: command succeeds and lists `20260609090000_registration_rejection_recovery.sql` as a local migration.

### Task 2: Extend the Edge Function Action Contract

**Files:**

- Modify: `backend/supabase/functions/manage-registrations/index.ts`

- [ ] **Step 1: Extend the action type**

Replace the manager action union with:

```ts
type ManagerRegistrationAction = "list_pending" | "list_class" | "approve" | "reject" | "cancel" | "approve_rejected" | "allow_reregister";
```

- [ ] **Step 2: Map new SQL errors**

In `toApiError`, include the new status error in the bad-request group and the live-replacement error as conflict:

```ts
	if (message.includes("registration_live_replacement_exists")) {
		return new ApiError(409, "conflict", "A live registration already exists for this user and class.");
	}

	if (
		message.includes("registration_not_pending") ||
		message.includes("registration_not_rejected") ||
		message.includes("registration_not_cancellable") ||
		message.includes("unsupported_registration_action") ||
		message.includes("class_not_registerable") ||
		message.includes("membership_required") ||
		message.includes("membership_stock_depleted") ||
		message.includes("class_capacity_full")
	) {
		return new ApiError(400, "bad_request", message);
	}
```

- [ ] **Step 3: Route the new actions through the existing RPC call**

Replace:

```ts
		if (action === "approve" || action === "reject" || action === "cancel") {
```

with:

```ts
		if (action === "approve" || action === "reject" || action === "cancel" || action === "approve_rejected" || action === "allow_reregister") {
```

Keep the existing request body, RPC call, and response shape unchanged.

- [ ] **Step 4: Run static inspection**

Run from the repository root:

```bash
git diff -- backend/supabase/functions/manage-registrations/index.ts backend/supabase/migrations/20260609090000_registration_rejection_recovery.sql
```

Expected: only the new migration and additive Edge Function action/error mapping are changed.

## Verification

Run from the repository root:

```bash
git diff --check
```

Expected: exits 0.

Run from `backend/`:

```bash
rtk npm run supabase:migrations
```

Expected: exits 0 and shows the new migration in the local list. If the local Supabase CLI or stack is unavailable, record a verification-environment blocker with this command as not completed.

When a local Supabase stack is available, perform rollback-safe SQL or Edge Function smoke for:

- pending registration -> `reject` -> status `rejected`
- rejected registration -> `approve_rejected` -> status `approved`
- rejected registration -> `allow_reregister` -> status remains `rejected` and `rejection_recovery_action = 'allow_reregister'`
- rejected registration -> user creates a new pending/approved registration -> old `approve_rejected` fails with `registration_live_replacement_exists`

Expected: all smoke cases match the spec.

## Acceptance Criteria Covered

- Manager can approve rejected class registrations.
- Manager can allow re-registration without deleting rejection history or changing rejected status.
- Duplicate live replacement prevents old rejected approval.
- Recovery stays manager-only and product-scoped through the existing Edge Function context.

## Risks And Rollback

- Replacing a SQL function can unintentionally drop prior cancellation behavior. Compare the new function against `20260608020000_membership_cancellation_audit.sql` before applying.
- Rollback is a forward migration restoring the previous `manage_class_registration` body from `20260608020000_membership_cancellation_audit.sql`.
- Do not change the partial unique index; it is the reason fresh re-registration works.
- Metadata columns are additive; rollback can leave them unused rather than dropping audit data.

## Non-Goals

- No product-user rejection lifecycle.
- No deletion of rejected registrations.
- No new registration status values.
- No use of `cancelled` to represent allow-re-register recovery.
- No frontend UI in this chunk.

## Type And Name Consistency

Verify these names exactly:

- `approve_rejected`
- `allow_reregister`
- `registration_not_rejected`
- `registration_live_replacement_exists`
- `rejected_at`
- `rejected_by`
- `rejection_recovered_at`
- `rejection_recovered_by`
- `rejection_recovery_action`
- `public.manage_class_registration`
- `ManagerRegistrationAction`
