create extension if not exists pgcrypto;

create table public.products (
	id uuid primary key default gen_random_uuid(),
	product_key text not null unique,
	name text not null,
	status text not null default 'active' check (status in ('active', 'inactive')),
	generation_horizon_weeks integer not null default 8 check (generation_horizon_weeks between 1 and 52),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.product_allowed_origins (
	product_id uuid not null references public.products(id) on delete cascade,
	origin text not null,
	environment text not null default 'development' check (environment in ('development', 'production')),
	created_at timestamptz not null default now(),
	primary key (product_id, origin)
);

create table public.profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	display_name text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.product_users (
	product_id uuid not null references public.products(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	role text not null check (role in ('manager', 'user')),
	status text not null default 'active' check (status in ('active', 'inactive')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (product_id, user_id)
);

create table public.platform_admins (
	user_id uuid primary key references auth.users(id) on delete cascade,
	created_at timestamptz not null default now()
);

create index product_users_user_id_idx on public.product_users(user_id);
create index product_users_product_role_idx on public.product_users(product_id, role);
create index product_allowed_origins_origin_idx on public.product_allowed_origins(origin);

create or replace function public.is_platform_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.platform_admins pa
		where pa.user_id = check_user_id
	);
$$;

create or replace function public.has_product_role(check_product_id uuid, allowed_roles text[], check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.product_users pu
		where pu.product_id = check_product_id
			and pu.user_id = check_user_id
			and pu.status = 'active'
			and pu.role = any(allowed_roles)
	);
$$;

create or replace function public.resolve_product_by_key_and_origin(p_product_key text, p_origin text)
returns table(product_id uuid, product_key text, name text)
language sql
stable
security definer
set search_path = public
as $$
	select p.id, p.product_key, p.name
	from public.products p
	join public.product_allowed_origins o on o.product_id = p.id
	where p.product_key = p_product_key
		and p.status = 'active'
		and o.origin = p_origin;
$$;

create or replace function public.prevent_last_manager_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	active_manager_count integer;
begin
	if old.role = 'manager' and old.status = 'active' then
		select count(*) into active_manager_count
		from public.product_users
		where product_id = old.product_id
			and role = 'manager'
			and status = 'active'
			and user_id <> old.user_id;

		if active_manager_count = 0 and (tg_op = 'DELETE' or new.role <> 'manager' or new.status <> 'active') then
			raise exception 'cannot remove the last active manager for product %', old.product_id;
		end if;
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;
	return new;
end;
$$;

create trigger prevent_last_manager_loss_update
before update on public.product_users
for each row execute function public.prevent_last_manager_loss();

create trigger prevent_last_manager_loss_delete
before delete on public.product_users
for each row execute function public.prevent_last_manager_loss();

alter table public.products enable row level security;
alter table public.product_allowed_origins enable row level security;
alter table public.profiles enable row level security;
alter table public.product_users enable row level security;
alter table public.platform_admins enable row level security;

grant select on public.products to anon, authenticated;
grant select on public.product_allowed_origins to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.product_users to authenticated;
grant execute on function public.resolve_product_by_key_and_origin(text, text) to anon, authenticated;
grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.has_product_role(uuid, text[], uuid) to authenticated;

create policy products_read_allowed
on public.products for select
to anon, authenticated
using (status = 'active');

create policy product_origins_manager_read
on public.product_allowed_origins for select
to authenticated
using (public.has_product_role(product_id, array['manager']) or public.is_platform_admin());

create policy profiles_self_read
on public.profiles for select
to authenticated
using (user_id = auth.uid());

create policy profiles_self_write
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy profiles_self_update
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy product_users_self_or_manager_read
on public.product_users for select
to authenticated
using (
	user_id = auth.uid()
	or public.has_product_role(product_id, array['manager'])
	or public.is_platform_admin()
);

create policy platform_admins_self_read
on public.platform_admins for select
to authenticated
using (user_id = auth.uid());
