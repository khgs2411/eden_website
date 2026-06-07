# Chunk 07: Registration Engine

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `03-template-class-core.md`, `05-schedule-generation-engine.md`, `06-membership-ledger.md`
**Enables:** `08-attendance-engine.md`, user registration UI

## Goal

Implement atomic class registration, cancellation, approval/rejection, capacity checks, membership requirement/policy behavior, stock consumption/restoration, and ledger integration.

## Source Artifacts

- Root spec: Registration + Membership Interaction, Classes, Memberships.
- Root agenda: Questions 4, 5, 16, 17, 18, 22, 23, 24, 25.
- Context: Class, Member, Membership Ledger, Class Participant.

## Relationships

- **Depends on:** concrete class rows, generated classes, membership grants/ledger.
- **Enables:** attendance engine and user registration UI.
- **Shared contracts:** registration status values, registration policy values, stock restoration rules.
- **Integration points:** class capacity, membership ledger, class participants.

## API Contract

Register endpoint request:

```json
{ "product_key": "eden", "class_id": "<class-uuid>" }
```

Register success response:

```json
{ "data": { "registration_id": "<registration-uuid>", "status": "approved", "stock_consumed": 1 }, "error": null }
```

Cancel request:

```json
{ "product_key": "eden", "registration_id": "<registration-uuid>", "action": "cancel" }
```

Stock timing contract:

- Stock is consumed only when a registration becomes `approved`.
- Member registrations under `member_auto_approve` become approved immediately, so stock is consumed during registration.
- Member registrations under `approval_required` remain pending, so stock is consumed only when the manager approves.
- Cancellations restore stock only when a prior approved registration consumed stock and cancellation happens before class start or through manager class cancellation restoration.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_registration_engine.sql` - registrations table/functions.
- `supabase/functions/register-class/index.ts` - user registration/cancellation API.
- `supabase/functions/manage-registrations/index.ts` - manager approve/reject/cancel API.

**Modify:**
- class list APIs to include user registration status where needed.

**Test:**
- SQL/RPC tests for capacity, stock, cancellation, policies.

## Implementation Tasks

### Task 1: Create registration schema

- [ ] Run `supabase migration new registration_engine`.
- [ ] Create `class_registrations` with this DDL contract:

```sql
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
```
- [ ] Enforce one active registration per class/user excluding cancelled/rejected as appropriate.
- [ ] Add indexes for class pending approvals and user registration history.

### Task 2: Implement transactional registration

- [ ] Function signature and transaction skeleton:

```sql
create or replace function public.register_for_class(p_product_id uuid, p_class_id uuid, p_user_id uuid)
returns public.class_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes%rowtype;
  v_product_user public.product_users%rowtype;
  v_grant public.membership_grants%rowtype;
  v_approved_count integer;
  v_status text;
  v_stock_consumed integer := 0;
  v_registration public.class_registrations%rowtype;
begin
  select * into v_class
  from public.classes
  where id = p_class_id
    and product_id = p_product_id
  for update;

  if not found then
    raise exception 'class_not_found';
  end if;

  if v_class.status <> 'published'
    or v_class.lifecycle_status in ('cancelled', 'in_progress', 'completed')
    or v_class.starts_at <= now() then
    raise exception 'class_not_registerable';
  end if;

  select * into v_product_user
  from public.product_users
  where product_id = p_product_id
    and user_id = p_user_id
    and status = 'active';

  if not found then
    raise exception 'product_user_not_found';
  end if;

  select count(*) into v_approved_count
  from public.class_registrations
  where class_id = p_class_id
    and status = 'approved';

  if v_approved_count >= v_class.capacity then
    raise exception 'class_capacity_full';
  end if;

  select * into v_grant
  from public.get_active_membership_grant(p_product_id, p_user_id);

  if v_class.membership_requirement = 'required' and v_grant.id is null then
    raise exception 'membership_required';
  end if;

  if v_class.registration_policy = 'auto_approve' then
    v_status := 'approved';
  elsif v_class.registration_policy = 'member_auto_approve' and v_grant.id is not null then
    v_status := 'approved';
  else
    v_status := 'pending';
  end if;

  if v_status = 'approved' and v_grant.id is not null and v_grant.mode in ('stock', 'limited_stock') then
    update public.membership_grants
      set remaining_stock = remaining_stock - 1,
          updated_at = now()
    where id = v_grant.id
      and remaining_stock > 0
    returning * into v_grant;

    if not found then
      raise exception 'membership_stock_depleted';
    end if;

    v_stock_consumed := 1;
  end if;

  insert into public.class_registrations (
    product_id, class_id, user_id, status, membership_grant_id, stock_consumed, approved_at
  )
  values (
    p_product_id, p_class_id, p_user_id, v_status, v_grant.id, v_stock_consumed,
    case when v_status = 'approved' then now() else null end
  )
  returning * into v_registration;

  if v_grant.id is not null then
    insert into public.membership_ledger (
      product_id, user_id, membership_grant_id, event_type, stock_delta, class_id, registration_id, metadata, created_by
    )
    values (
      p_product_id, p_user_id, v_grant.id, 'class_registration', -v_stock_consumed,
      p_class_id, v_registration.id, jsonb_build_object('registration_status', v_status), p_user_id
    );
  end if;

  return v_registration;
end;
$$;
```

- [ ] Function loads and locks class row.
- [ ] Reject if class not published, hidden, cancelled, in_progress, completed, or starts_at has passed.
- [ ] Check product user access.
- [ ] Apply visibility, membership_requirement, and registration_policy.
- [ ] Check capacity against approved registrations.
- [ ] For stock memberships, decrement stock and write ledger event only when the resulting registration status is `approved`.
- [ ] Create status:
  - `approved` for `auto_approve`
  - `approved` for members under `member_auto_approve`
  - `pending` for non-members under `member_auto_approve`
  - `pending` for everyone under `approval_required`.

### Task 3: Implement cancellation/restoration

- [ ] User cancellation before class start restores consumed stock and writes `registration_cancelled`.
- [ ] Manager class cancellation restoration will be callable by class cancellation flows and writes `class_cancelled_restore`.
- [ ] After class start, no automatic restoration except manager adjustment.

### Task 4: Implement manager approval APIs

- [ ] Manager can approve pending registration if capacity remains.
- [ ] Manager can reject pending registration.
- [ ] Approval of membership-backed pending registration consumes stock if not already consumed and writes a `class_registration` ledger event with `stock_delta = -1`.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
- Register user for `auto_approve` class:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <user-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","class_id":"<class-id>"}' http://127.0.0.1:54321/functions/v1/register-class
```

  - Expected: approved row.
- Register non-member for `member_auto_approve`.
  - Expected: pending row.
- Register member with stock.
  - Expected: approved row, stock decremented, ledger event.
- Cancel before start.
  - Expected: stock restored and ledger event.
- Simulate capacity full.
  - Expected: registration rejected with capacity error.

## Acceptance Criteria Covered

- Users register according to class policy.
- Membership can bypass approval when policy allows.
- Membership stock consumption/restoration is atomic and auditable.
- Registration cutoff uses `starts_at` and class lifecycle.

## Risks And Rollback

- Capacity/stock races are high risk. Use row locks or transactional SQL function.
- Rollback before attendance/frontend chunks by removing registration migration/functions.

## Non-Goals

- Attendance marking.
- Waitlists.
- Payments.

## Type And Name Consistency

Use registration statuses `pending`, `approved`, `rejected`, `cancelled` exactly.
