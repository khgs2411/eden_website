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
