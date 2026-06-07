create table public.membership_types (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	name text not null,
	mode text not null check (mode in ('stock', 'limited_stock', 'limited', 'infinite')),
	default_stock integer check (default_stock is null or default_stock > 0),
	default_duration_days integer check (default_duration_days is null or default_duration_days > 0),
	status text not null default 'active' check (status in ('active', 'inactive')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.membership_grants (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	membership_type_id uuid not null references public.membership_types(id) on delete restrict,
	mode text not null check (mode in ('stock', 'limited_stock', 'limited', 'infinite')),
	valid_from timestamptz not null default now(),
	valid_until timestamptz,
	total_stock integer,
	remaining_stock integer,
	status text not null default 'active' check (status in ('active', 'inactive', 'revoked', 'replaced', 'expired')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (remaining_stock is null or remaining_stock >= 0)
);

create unique index membership_grants_one_active_idx
on public.membership_grants(product_id, user_id)
where status = 'active';

create table public.membership_ledger (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	membership_grant_id uuid references public.membership_grants(id) on delete set null,
	event_type text not null check (event_type in ('membership_granted','membership_upgraded','membership_revoked','class_registration','registration_cancelled','class_cancelled_restore','manager_adjustment')),
	stock_delta integer not null default 0,
	class_id uuid,
	registration_id uuid,
	metadata jsonb not null default '{}'::jsonb,
	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now()
);

create index membership_types_product_status_idx on public.membership_types(product_id, status);
create index membership_grants_product_user_idx on public.membership_grants(product_id, user_id);
create index membership_ledger_product_user_created_idx on public.membership_ledger(product_id, user_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = private, public
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger membership_types_touch_updated_at
before update on public.membership_types
for each row execute function private.touch_updated_at();

create trigger membership_grants_touch_updated_at
before update on public.membership_grants
for each row execute function private.touch_updated_at();

create or replace function private.require_active_product_user(p_product_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
	if not exists (
		select 1
		from public.product_users pu
		where pu.product_id = p_product_id
			and pu.user_id = p_user_id
			and pu.status = 'active'
	) then
		raise exception 'user % is not an active product user for product %', p_user_id, p_product_id;
	end if;
end;
$$;

create or replace function private.membership_grant_values(
	p_mode text,
	p_default_stock integer,
	p_default_duration_days integer,
	p_valid_from timestamptz,
	p_valid_until timestamptz,
	p_total_stock integer,
	out resolved_valid_until timestamptz,
	out resolved_total_stock integer,
	out resolved_remaining_stock integer
)
language plpgsql
stable
set search_path = private, public
as $$
begin
	resolved_valid_until := p_valid_until;
	resolved_total_stock := p_total_stock;
	resolved_remaining_stock := p_total_stock;

	if p_mode in ('limited', 'limited_stock') and resolved_valid_until is null and p_default_duration_days is not null then
		resolved_valid_until := p_valid_from + make_interval(days => p_default_duration_days);
	end if;

	if p_mode in ('stock', 'limited_stock') and resolved_total_stock is null then
		resolved_total_stock := p_default_stock;
		resolved_remaining_stock := p_default_stock;
	end if;

	if p_mode in ('stock', 'limited_stock') and (resolved_total_stock is null or resolved_total_stock <= 0) then
		raise exception '% memberships require positive stock', p_mode;
	end if;

	if p_mode in ('limited', 'limited_stock') and resolved_valid_until is null then
		raise exception '% memberships require a validity end date or default duration', p_mode;
	end if;

	if p_mode in ('limited', 'infinite') then
		resolved_total_stock := null;
		resolved_remaining_stock := null;
	end if;
end;
$$;

create or replace function private.membership_mode_rank(p_mode text)
returns integer
language sql
immutable
set search_path = private, public
as $$
	select case p_mode
		when 'stock' then 1
		when 'limited_stock' then 2
		when 'limited' then 3
		when 'infinite' then 4
		else 0
	end;
$$;

create or replace function public.grant_membership(
	p_product_id uuid,
	p_user_id uuid,
	p_membership_type_id uuid,
	p_valid_from timestamptz default now(),
	p_valid_until timestamptz default null,
	p_total_stock integer default null,
	p_created_by uuid default auth.uid()
)
returns public.membership_grants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	membership_type public.membership_types;
	grant_row public.membership_grants;
	resolved_valid_until timestamptz;
	resolved_total_stock integer;
	resolved_remaining_stock integer;
begin
	perform private.require_active_product_user(p_product_id, p_user_id);

	select *
	into membership_type
	from public.membership_types mt
	where mt.id = p_membership_type_id
		and mt.product_id = p_product_id
		and mt.status = 'active';

	if not found then
		raise exception 'active membership type % was not found for product %', p_membership_type_id, p_product_id;
	end if;

	select *
	into resolved_valid_until, resolved_total_stock, resolved_remaining_stock
	from private.membership_grant_values(
		membership_type.mode,
		membership_type.default_stock,
		membership_type.default_duration_days,
		coalesce(p_valid_from, now()),
		p_valid_until,
		p_total_stock
	);

	insert into public.membership_grants (
		product_id,
		user_id,
		membership_type_id,
		mode,
		valid_from,
		valid_until,
		total_stock,
		remaining_stock
	)
	values (
		p_product_id,
		p_user_id,
		p_membership_type_id,
		membership_type.mode,
		coalesce(p_valid_from, now()),
		resolved_valid_until,
		resolved_total_stock,
		resolved_remaining_stock
	)
	returning * into grant_row;

	insert into public.membership_ledger (
		product_id,
		user_id,
		membership_grant_id,
		event_type,
		stock_delta,
		metadata,
		created_by
	)
	values (
		p_product_id,
		p_user_id,
		grant_row.id,
		'membership_granted',
		coalesce(resolved_total_stock, 0),
		jsonb_build_object('membership_type_id', p_membership_type_id),
		p_created_by
	);

	return grant_row;
end;
$$;

create or replace function public.upgrade_membership(
	p_product_id uuid,
	p_user_id uuid,
	p_membership_type_id uuid,
	p_valid_from timestamptz default now(),
	p_valid_until timestamptz default null,
	p_total_stock integer default null,
	p_created_by uuid default auth.uid()
)
returns public.membership_grants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	membership_type public.membership_types;
	old_grant public.membership_grants;
	new_grant public.membership_grants;
	resolved_valid_until timestamptz;
	resolved_total_stock integer;
	resolved_remaining_stock integer;
begin
	perform private.require_active_product_user(p_product_id, p_user_id);

	select *
	into membership_type
	from public.membership_types mt
	where mt.id = p_membership_type_id
		and mt.product_id = p_product_id
		and mt.status = 'active';

	if not found then
		raise exception 'active membership type % was not found for product %', p_membership_type_id, p_product_id;
	end if;

	select *
	into old_grant
	from public.membership_grants mg
	where mg.product_id = p_product_id
		and mg.user_id = p_user_id
		and mg.status = 'active'
	for update;

	if not found then
		raise exception 'no active membership grant found for user % in product %', p_user_id, p_product_id;
	end if;

	if private.membership_mode_rank(membership_type.mode) <= private.membership_mode_rank(old_grant.mode) then
		raise exception 'membership upgrades must move to a higher mode';
	end if;

	update public.membership_grants
	set status = 'replaced'
	where id = old_grant.id;

	select *
	into resolved_valid_until, resolved_total_stock, resolved_remaining_stock
	from private.membership_grant_values(
		membership_type.mode,
		membership_type.default_stock,
		membership_type.default_duration_days,
		coalesce(p_valid_from, now()),
		p_valid_until,
		p_total_stock
	);

	insert into public.membership_grants (
		product_id,
		user_id,
		membership_type_id,
		mode,
		valid_from,
		valid_until,
		total_stock,
		remaining_stock
	)
	values (
		p_product_id,
		p_user_id,
		p_membership_type_id,
		membership_type.mode,
		coalesce(p_valid_from, now()),
		resolved_valid_until,
		resolved_total_stock,
		resolved_remaining_stock
	)
	returning * into new_grant;

	insert into public.membership_ledger (
		product_id,
		user_id,
		membership_grant_id,
		event_type,
		stock_delta,
		metadata,
		created_by
	)
	values (
		p_product_id,
		p_user_id,
		new_grant.id,
		'membership_upgraded',
		coalesce(resolved_total_stock, 0),
		jsonb_build_object(
			'previous_grant_id', old_grant.id,
			'previous_membership_type_id', old_grant.membership_type_id,
			'membership_type_id', p_membership_type_id
		),
		p_created_by
	);

	return new_grant;
end;
$$;

create or replace function public.revoke_membership(
	p_product_id uuid,
	p_membership_grant_id uuid,
	p_created_by uuid default auth.uid()
)
returns public.membership_grants
language plpgsql
security definer
set search_path = public, private
as $$
declare
	grant_row public.membership_grants;
begin
	select *
	into grant_row
	from public.membership_grants mg
	where mg.id = p_membership_grant_id
		and mg.product_id = p_product_id
		and mg.status = 'active'
	for update;

	if not found then
		raise exception 'active membership grant % was not found for product %', p_membership_grant_id, p_product_id;
	end if;

	update public.membership_grants
	set status = 'revoked'
	where id = grant_row.id
	returning * into grant_row;

	insert into public.membership_ledger (
		product_id,
		user_id,
		membership_grant_id,
		event_type,
		stock_delta,
		metadata,
		created_by
	)
	values (
		grant_row.product_id,
		grant_row.user_id,
		grant_row.id,
		'membership_revoked',
		case when grant_row.remaining_stock is null then 0 else -grant_row.remaining_stock end,
		jsonb_build_object('membership_type_id', grant_row.membership_type_id),
		p_created_by
	);

	return grant_row;
end;
$$;

create or replace function public.get_active_membership_grant(p_product_id uuid, p_user_id uuid)
returns public.membership_grants
language sql
stable
security definer
set search_path = public
as $$
	select *
	from public.membership_grants
	where product_id = p_product_id
		and user_id = p_user_id
		and status = 'active'
		and (valid_until is null or valid_until > now())
		and (remaining_stock is null or remaining_stock > 0)
	limit 1;
$$;

alter table public.membership_types enable row level security;
alter table public.membership_grants enable row level security;
alter table public.membership_ledger enable row level security;

grant select on public.membership_types to authenticated;
grant select on public.membership_grants to authenticated;
grant select on public.membership_ledger to authenticated;
grant select, insert, update on public.membership_types to service_role;
grant select on public.membership_grants to service_role;
grant select on public.membership_ledger to service_role;
revoke all on function public.grant_membership(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) from public, anon, authenticated;
revoke all on function public.upgrade_membership(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) from public, anon, authenticated;
revoke all on function public.revoke_membership(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_active_membership_grant(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_membership(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) to service_role;
grant execute on function public.upgrade_membership(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) to service_role;
grant execute on function public.revoke_membership(uuid, uuid, uuid) to service_role;
grant execute on function public.get_active_membership_grant(uuid, uuid) to authenticated, service_role;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.require_active_product_user(uuid, uuid) from public, anon, authenticated;
revoke all on function private.membership_grant_values(text, integer, integer, timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function private.membership_mode_rank(text) from public, anon, authenticated;

create policy membership_types_manager_read
on public.membership_types for select
to authenticated
using (private.has_product_role(product_id, array['manager']) or private.is_platform_admin());

create policy membership_grants_self_or_manager_read
on public.membership_grants for select
to authenticated
using (
	user_id = auth.uid()
	or private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);

create policy membership_ledger_self_or_manager_read
on public.membership_ledger for select
to authenticated
using (
	user_id = auth.uid()
	or private.has_product_role(product_id, array['manager'])
	or private.is_platform_admin()
);
