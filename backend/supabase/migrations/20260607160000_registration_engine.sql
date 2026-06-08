create table public.class_registrations (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	class_id uuid not null references public.classes(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
	membership_grant_id uuid references public.membership_grants(id) on delete set null,
	stock_consumed integer not null default 0 check (stock_consumed >= 0),
	approved_at timestamptz,
	cancelled_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index class_registrations_one_live_idx
on public.class_registrations(class_id, user_id)
where status in ('pending', 'approved');

create index class_registrations_class_status_idx on public.class_registrations(product_id, class_id, status);
create index class_registrations_user_history_idx on public.class_registrations(product_id, user_id, created_at desc);
create index class_registrations_pending_idx on public.class_registrations(product_id, class_id, created_at)
where status = 'pending';

create trigger class_registrations_touch_updated_at
before update on public.class_registrations
for each row execute function private.touch_updated_at();

create or replace function private.ensure_class_registerable(v_class public.classes)
returns void
language plpgsql
set search_path = private, public
as $$
begin
	if v_class.status <> 'published'
		or v_class.lifecycle_status in ('cancelled', 'in_progress', 'completed')
		or v_class.starts_at <= now() then
		raise exception 'class_not_registerable';
	end if;

	if v_class.visibility = 'hidden' then
		raise exception 'class_not_registerable';
	end if;
end;
$$;

create or replace function private.approved_registration_count(p_class_id uuid)
returns integer
language sql
stable
set search_path = private, public
as $$
	select count(*)::integer
	from public.class_registrations
	where class_id = p_class_id
		and status = 'approved';
$$;

create or replace function private.consume_registration_stock(
	p_product_id uuid,
	p_user_id uuid,
	p_class_id uuid,
	p_registration_id uuid,
	p_membership_grant_id uuid,
	p_created_by uuid
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_grant public.membership_grants;
begin
	if p_membership_grant_id is null then
		return 0;
	end if;

	select *
	into v_grant
	from public.membership_grants
	where id = p_membership_grant_id
		and product_id = p_product_id
		and user_id = p_user_id
		and status = 'active'
		and (valid_until is null or valid_until > now())
	for update;

	if not found then
		raise exception 'membership_required';
	end if;

	if v_grant.mode not in ('stock', 'limited_stock') then
		return 0;
	end if;

	update public.membership_grants
	set remaining_stock = remaining_stock - 1
	where id = v_grant.id
		and remaining_stock > 0
	returning * into v_grant;

	if not found then
		raise exception 'membership_stock_depleted';
	end if;

	return 1;
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
	if p_registration.membership_grant_id is null or p_registration.stock_consumed <= 0 then
		return;
	end if;

	update public.membership_grants
	set remaining_stock = remaining_stock + p_registration.stock_consumed
	where id = p_registration.membership_grant_id
		and product_id = p_registration.product_id;

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
		p_registration.stock_consumed,
		p_registration.class_id,
		p_registration.id,
		p_metadata,
		p_created_by
	);
end;
$$;

create or replace function public.register_for_class(p_product_id uuid, p_class_id uuid, p_user_id uuid)
returns public.class_registrations
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
	v_product_user public.product_users;
	v_grant public.membership_grants;
	v_status text;
	v_stock_consumed integer := 0;
	v_registration public.class_registrations;
begin
	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	perform private.ensure_class_registerable(v_class);

	select *
	into v_product_user
	from public.product_users
	where product_id = p_product_id
		and user_id = p_user_id
		and status = 'active';

	if not found then
		raise exception 'product_user_not_found';
	end if;

	if private.approved_registration_count(p_class_id) >= v_class.capacity then
		raise exception 'class_capacity_full';
	end if;

	select *
	into v_grant
	from public.get_active_membership_grant(p_product_id, p_user_id);

	if (v_class.membership_requirement = 'required' or v_class.visibility = 'members_only')
		and v_grant.id is null then
		raise exception 'membership_required';
	end if;

	if v_class.registration_policy = 'auto_approve' then
		v_status := 'approved';
	elsif v_class.registration_policy = 'member_auto_approve' and v_grant.id is not null then
		v_status := 'approved';
	else
		v_status := 'pending';
	end if;

	insert into public.class_registrations (
		product_id,
		class_id,
		user_id,
		status,
		membership_grant_id,
		approved_at
	)
	values (
		p_product_id,
		p_class_id,
		p_user_id,
		v_status,
		v_grant.id,
		case when v_status = 'approved' then now() else null end
	)
	returning * into v_registration;

	if v_status = 'approved' and v_grant.id is not null then
		v_stock_consumed := private.consume_registration_stock(
			p_product_id,
			p_user_id,
			p_class_id,
			v_registration.id,
			v_grant.id,
			p_user_id
		);

		update public.class_registrations
		set stock_consumed = v_stock_consumed
		where id = v_registration.id
		returning * into v_registration;
	end if;

	if v_grant.id is not null then
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
			p_user_id,
			v_grant.id,
			'class_registration',
			-v_stock_consumed,
			p_class_id,
			v_registration.id,
			jsonb_build_object('registration_status', v_status),
			p_user_id
		);
	end if;

	return v_registration;
exception
	when unique_violation then
		raise exception 'registration_already_exists';
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

	if v_should_restore then
		perform private.restore_registration_stock(
			v_registration,
			'registration_cancelled',
			p_created_by,
			jsonb_build_object('force_restore', p_force_restore)
		);
	end if;

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

		if v_registration.status = 'approved'
			and v_registration.stock_consumed > 0
			and v_class.starts_at > now() then
			perform private.restore_registration_stock(
				v_registration,
				'registration_cancelled',
				p_created_by,
				jsonb_build_object('cancelled_by', 'manager')
			);
		end if;

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
begin
	for v_registration in
		select *
		from public.class_registrations
		where product_id = p_product_id
			and class_id = p_class_id
			and status in ('pending', 'approved')
		for update
	loop
		if v_registration.status = 'approved' and v_registration.stock_consumed > 0 then
			perform private.restore_registration_stock(
				v_registration,
				'class_cancelled_restore',
				p_created_by,
				jsonb_build_object('class_cancelled', true)
			);
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

create or replace function public.cancel_class_with_registration_restoration(
	p_product_id uuid,
	p_class_id uuid,
	p_created_by uuid default auth.uid()
)
returns public.classes
language plpgsql
security definer
set search_path = public, private
as $$
declare
	v_class public.classes;
begin
	select *
	into v_class
	from public.classes
	where id = p_class_id
		and product_id = p_product_id
	for update;

	if not found then
		raise exception 'class_not_found';
	end if;

	perform public.restore_class_cancelled_registrations(p_product_id, p_class_id, p_created_by);

	update public.classes
	set lifecycle_status = 'cancelled'
	where id = p_class_id
	returning * into v_class;

	return v_class;
end;
$$;

alter table public.class_registrations enable row level security;

grant select on public.class_registrations to authenticated;
grant select on public.class_registrations to service_role;
revoke all on function private.ensure_class_registerable(public.classes) from public, anon, authenticated;
revoke all on function private.approved_registration_count(uuid) from public, anon, authenticated;
revoke all on function private.consume_registration_stock(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.restore_registration_stock(public.class_registrations, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.register_for_class(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_class_registration(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.manage_class_registration(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.restore_class_cancelled_registrations(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_class_with_registration_restoration(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_for_class(uuid, uuid, uuid) to service_role;
grant execute on function public.cancel_class_registration(uuid, uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.manage_class_registration(uuid, uuid, text, uuid) to service_role;
grant execute on function public.restore_class_cancelled_registrations(uuid, uuid, uuid) to service_role;
grant execute on function public.cancel_class_with_registration_restoration(uuid, uuid, uuid) to service_role;

create policy class_registrations_self_or_manager_read
on public.class_registrations for select
to authenticated
using (
	user_id = auth.uid()
	or private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);
