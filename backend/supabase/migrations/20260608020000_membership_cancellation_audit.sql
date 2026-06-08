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
begin
	if p_action not in ('approve', 'reject', 'cancel') then
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

	if p_action = 'reject' then
		if v_registration.status <> 'pending' then
			raise exception 'registration_not_pending';
		end if;

		update public.class_registrations
		set status = 'rejected'
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

	if v_registration.status <> 'pending' then
		raise exception 'registration_not_pending';
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
			jsonb_build_object('registration_status', 'approved', 'approved_by_manager', true),
			p_created_by
		);
	end if;

	update public.class_registrations
	set status = 'approved',
		stock_consumed = v_stock_consumed,
		approved_at = now()
	where id = v_registration.id
	returning * into v_registration;

	return v_registration;
end;
$$;

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

revoke all on function private.write_registration_cancellation_ledger(public.class_registrations, text, uuid, jsonb, boolean) from public, anon, authenticated;
