# Chunk 06: Membership Ledger

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-product-role-foundation.md`, `02-edge-api-foundation.md`
**Enables:** `07-registration-engine.md`, manager membership UI

## Goal

Implement membership types, user grants, one-active-grant invariant, upgrade replacement, active entitlement lookup, finalized ledger event names, and ledger recording for membership-backed actions.

## Source Artifacts

- Root spec: Memberships, Registration + Membership Interaction.
- Root agenda: Questions 5, 7, 19, 25.
- Context: Member, Membership Ledger, Product User.

## Relationships

- **Depends on:** product users and manager API guards.
- **Enables:** membership-aware registration and manager membership screens.
- **Shared contracts:** membership mode values, grant status, ledger event names.
- **Integration points:** registration engine stock consumption/restoration.

## API Contract

`memberships` manager endpoint actions:

- `list_types`
- `create_type`
- `deactivate_type`
- `grant`
- `upgrade`
- `revoke`
- `list_user_grants`
- `list_ledger`

All requests include `product_key`. Mutating requests require manager role.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_membership_ledger.sql` - membership schema and functions.
- `supabase/functions/memberships/index.ts` - manager membership type/grant APIs.

**Modify:**
- `supabase/functions/_shared/context.ts` - reuse `requireProductManager` and shared response helpers from Chunk 02.

**Test:**
- SQL smoke tests for one-active-grant invariant and ledger writes.

## Implementation Tasks

### Task 1: Create membership schema

- [ ] Run `supabase migration new membership_ledger`.
- [ ] Create tables with this DDL contract:

```sql
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
```
- [ ] Enforce one active grant per `(product_id, user_id)`.

### Task 2: Finalize ledger event names

- [ ] Use these v1 event names:
  - `membership_granted`
  - `membership_upgraded`
  - `membership_revoked`
  - `class_registration`
  - `registration_cancelled`
  - `class_cancelled_restore`
  - `manager_adjustment`
- [ ] Stock events carry signed deltas; non-stock events use `stock_delta = 0`.

### Task 3: Add manager APIs and grant functions

- [ ] Manager can create/update/deactivate membership types in product.
- [ ] Manager can grant, upgrade, revoke membership for product users.
- [ ] Upgrade immediately closes the previous active grant and starts the new grant.
- [ ] Every grant/upgrade/revoke writes ledger entries transactionally.

### Task 4: Add active entitlement lookup

- [ ] Create a function with this signature:

```sql
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
```
- [ ] Treat expired, inactive, depleted stock, and wrong-product grants as invalid.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
- Grant stock membership to a product user through manager API:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","action":"grant","user_id":"<user-id>","membership_type_id":"<type-id>"}' http://127.0.0.1:54321/functions/v1/memberships
```

  - Expected: active grant exists and ledger has `membership_granted`.
- Upgrade stock to limited.
  - Expected: old grant inactive, new grant active, ledger has `membership_upgraded`.
- Attempt second active grant without upgrade path.
  - Expected: constraint/function prevents it.

## Acceptance Criteria Covered

- Managers can create membership types and grant memberships.
- Modes support stock, limited_stock, limited, infinite.
- One active membership per product user in v1.
- Membership Ledger records all membership-backed actions.

## Risks And Rollback

- Incorrect grant constraints can block legitimate upgrades. Test replacement path.
- Rollback before registration chunk by removing migration/function files.

## Non-Goals

- Payment/selling.
- Registration consumption logic.
- Frontend membership UI.

## Type And Name Consistency

Use `Member` only for a product user with an active membership grant. Do not call every user a member.
