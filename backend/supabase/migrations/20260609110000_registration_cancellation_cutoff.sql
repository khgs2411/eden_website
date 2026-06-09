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
