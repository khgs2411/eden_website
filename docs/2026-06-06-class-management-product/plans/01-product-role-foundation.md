# Chunk 01: Product Role Foundation

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-edge-api-foundation.md`, all product-scoped domain chunks

## Goal

Create the product boundary and product-scoped authorization foundation in Supabase: products, allowed origins, profiles, product users, platform admins, manager/user role invariants, helper functions, RLS, grants, and local seed/bootstrap data.

## Source Artifacts

- Root spec sections: Product Model, Users and Roles, Technical Design Direction, Permissions / Security, Product Access Table.
- Root agenda: Questions 1, 2, 8, 10, 11, 12.
- Context terms: Product, Product Key, Product User, Platform Admin, Manager, User, Service Role.
- ADR 0001.
- Code paths: `supabase/config.toml`, `supabase/migrations/20260523082247_create_lesson_signups.sql`.

## Relationships

- **Depends on:** local Supabase CLI and stack availability.
- **Enables:** product-scoped Edge Functions, templates, classes, memberships, schedules, registrations.
- **Shared contracts:** `products`, `product_allowed_origins`, `profiles`, `product_users`, `platform_admins`; `manager`/`user` role enum; product helper functions.
- **Integration points:** Supabase Auth `auth.users`, exposed `public` schema with RLS enabled.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_product_role_foundation.sql` - product/role schema, helper functions, policies, grants. Use `supabase migration new product_role_foundation`; do not invent the timestamp.
- `supabase/seed.sql` - local Eden product, localhost origin rows, and optional platform admin bootstrap placeholder if the file does not exist.

**Modify:**
- `supabase/config.toml` - only if seed path or function config must be aligned; avoid unrelated config churn.

**Test:**
- SQL smoke queries run through `supabase db query` after migration reset.

## Implementation Tasks

### Task 1: Create the migration shell

**Files:**
- Create: `supabase/migrations/<generated>_product_role_foundation.sql`

- [ ] Run `supabase migration new product_role_foundation`.
Expected: prints a new migration file path under `supabase/migrations/`.

- [ ] In that generated migration, use this DDL as the starting contract:

```sql
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
```

### Task 2: Add helper functions and constraints

**Files:**
- Modify: generated migration from Task 1

- [ ] Add these helper functions. Keep `security definer` functions narrowly scoped with fixed `search_path`.

```sql
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
```

- [ ] Add a trigger that prevents deleting/deactivating/demoting the last active manager:

```sql
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
```

### Task 3: Enable RLS and grants

**Files:**
- Modify: generated migration from Task 1

- [ ] Enable RLS and grants with this policy contract:

```sql
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
```

### Task 4: Add local seed shape

**Files:**
- Create or modify: `supabase/seed.sql`

- [ ] Seed a local `products` row for Eden with a stable `product_key`, such as `eden`.
- [ ] Seed localhost allowed origins used by the Vite dev server and Supabase auth redirects.
- [ ] Use this seed shape and keep platform admin insertion commented unless a local UUID is provided:

```sql
insert into public.products (product_key, name)
values ('eden', 'Eden Dance')
on conflict (product_key) do nothing;

insert into public.product_allowed_origins (product_id, origin, environment)
select id, 'http://localhost:5173', 'development'
from public.products
where product_key = 'eden'
on conflict do nothing;

insert into public.product_allowed_origins (product_id, origin, environment)
select id, 'http://127.0.0.1:5173', 'development'
from public.products
where product_key = 'eden'
on conflict do nothing;

-- After creating a local auth user, promote the platform admin manually:
-- insert into public.platform_admins (user_id) values ('<local-auth-user-uuid>');
```

## Verification

- Run: `rtk supabase status`
  - Expected: local services are running; if not, run `rtk supabase start` before continuing.
- Run: `supabase db reset`
  - Expected: migrations apply successfully and seed runs.
- Run: `supabase migration list`
  - Expected: the new product-role migration is listed as applied locally.
- Run: `supabase db lint`
  - Expected: no fatal schema errors. Security warnings must be reviewed before moving on.
- Run: `supabase db query "select product_key, generation_horizon_weeks from public.products where product_key = 'eden';"`
  - Expected: one row with `eden` and `8`.
- Run: `supabase db query "select origin from public.product_allowed_origins o join public.products p on p.id = o.product_id where p.product_key = 'eden' order by origin;"`
  - Expected: includes `http://localhost:5173` and `http://127.0.0.1:5173`.

## Acceptance Criteria Covered

- Shared Supabase backend can represent product boundaries.
- Product key is public scope, not secret authorization.
- Product-scoped manager/user roles exist.
- Platform admin is separate from Supabase service role.
- RLS prevents cross-product access.

## Risks And Rollback

- RLS mistakes can expose product data. Keep policies narrow and verify with product/user test rows.
- If reset fails, rollback by removing the generated migration and rerunning `supabase db reset`.
- Do not alter the legacy `lesson_signups` table unless a policy conflict is discovered.

## Non-Goals

- Edge Function implementation.
- Templates, classes, schedules, memberships, registration, attendance, frontend UI.

## Type And Name Consistency

Use `product_id`, `product_key`, `product_users`, `manager`, and `user` exactly as defined in `CONTEXT.md` and ADR 0001.
