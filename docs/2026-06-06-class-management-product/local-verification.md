# Local Verification

This checklist verifies the Eden local playground for the reusable class-management product. It assumes commands run from the repository root and the local product key is `eden`.

## Environment

`.env.local` should match `.env.example` and use local Supabase values:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
VITE_PRODUCT_KEY=eden
```

The product frontend calls Edge Functions only. Do not add frontend table or RPC calls for product workflows.

## Command Order

1. Check local Supabase state:

```bash
rtk supabase status
```

If the stack is not running, start it:

```bash
rtk supabase start
```

2. Optional destructive reset for a clean local database:

```bash
supabase db reset
```

Run this only when local data loss is acceptable. For non-destructive review checks, skip this step and continue with the current local database.

Expected seed state after reset:

- `products` contains `product_key = eden`.
- `product_allowed_origins` contains `http://localhost:5173` and `http://127.0.0.1:5173`.
- `auth.users` contains local-only users `admin@admin.local` and `eden@manager.local` with password `password`.
- `admin@admin.local` is present in `platform_admins`.
- `eden@manager.local` is an active `manager` in `product_users` for the Eden product.
- No real user ids, JWTs, access tokens, or service-role keys are committed.

3. Confirm migration state:

```bash
rtk supabase migration list --local
```

Expected: all local migrations through the class-management and attendance chunks are applied.

4. Lint the local database:

```bash
supabase db lint
```

Expected: no fatal findings. Review warnings before handoff.

5. Serve Edge Functions for API smoke checks:

```bash
supabase functions serve
```

Expected: functions compile and serve locally without Deno import errors.

6. Lint the frontend:

```bash
npm run lint
```

Expected: no lint errors.

7. Build the frontend:

```bash
npm run build
```

Expected: TypeScript and Vite production build succeed.

## Security Regression Checks

Run these checks after applying the 2026-06-08 implementation-review fixes.

### Active Membership RPC Privilege

```bash
rtk supabase db query "select has_function_privilege('authenticated', 'public.get_active_membership_grant(uuid, uuid)', 'execute') as authenticated_can_execute;"
```

Expected: `authenticated_can_execute` is `false`.

### Member-Only Class Visibility

Use local users representing:

- an active product user without an active membership grant
- an active product user with an active membership grant

Call `classes` with each user's JWT:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <user-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"list_user"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected:

- non-member response does not include `visibility":"members_only"`
- member response may include `members_only` classes when such classes exist

## Membership Ledger Regression Checks

Verify these cancellation paths with local data:

- stock membership approved registration cancelled before class start writes `registration_cancelled` with positive `stock_delta`
- infinite or limited membership-backed registration cancellation writes `registration_cancelled` with `stock_delta = 0`
- manager class cancellation writes `class_cancelled_restore` for every membership-backed registration, with positive stock delta only when stock was consumed

Inspect ledger rows:

```bash
rtk supabase db query "select event_type, stock_delta, class_id, registration_id from public.membership_ledger order by created_at desc limit 20;"
```

Expected: cancellation/restoration rows exist for both stock and non-stock membership-backed registrations.

## Manager Promotion Boundary Checks

`manager-promote-manager` should promote only existing active product users. It should not create product access for arbitrary auth users.

Expected:

- target auth user without a `product_users` row returns 404 `not_found`
- target active `product_users` row returns role `manager`
- `admin-promote-manager` still works for platform-admin bootstrap

## Generated Class Source Integrity Checks

Check for invalid generated class source references:

```bash
rtk supabase db query "select c.id, c.product_id, c.schedule_id from public.classes c left join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and s.id is null;"
```

Expected: zero rows.

Confirm source constraints exist:

```bash
rtk supabase db query "select conname from pg_constraint where conname in ('classes_template_product_fk','schedules_id_template_product_unique','classes_schedule_product_fk','classes_generated_schedule_template_fk','classes_generated_source_consistency') order by conname;"
```

Expected: rows for `classes_generated_source_consistency`, `classes_generated_schedule_template_fk`, `classes_schedule_product_fk`, `classes_template_product_fk`, and `schedules_id_template_product_unique`.

Check generated class template alignment:

```bash
rtk supabase db query "select c.id from public.classes c join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and c.template_id is distinct from s.template_id;"
```

Expected: zero rows.

Check template product compatibility:

```bash
rtk supabase db query "select c.id, c.product_id, c.template_id from public.classes c left join public.class_templates t on t.id = c.template_id and t.product_id = c.product_id where c.template_id is not null and t.id is null;"
```

Expected: zero rows.

Check generated source-field consistency:

```bash
rtk supabase db query "select id, product_id, template_id, schedule_id, generated_for_date, source_timezone from public.classes where not ((schedule_id is null and generated_for_date is null and source_timezone is null) or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null));"
```

Expected: zero rows.

Manager class CRUD should reject generated source fields:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"create","name":"Manual class","starts_at":"2026-07-01T17:00:00Z","ends_at":"2026-07-01T18:00:00Z","capacity":10,"schedule_id":"00000000-0000-0000-0000-000000000000"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request`; `schedule_id` is controlled by schedule generation.

Generated class CRUD should reject template changes:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"update","class_id":"<generated-class-id>","template_id":"<same-product-template-id>"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request`; `template_id` is controlled by schedule generation for generated classes.

## Bootstrap Smoke

Create or sign in a local Supabase Auth user, then promote a platform admin locally:

```sql
insert into public.platform_admins (user_id)
values ('<local-auth-user-uuid>');
```

Call `product-context` from an allowed origin to associate the signed-in auth user with Eden:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <user-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden"}' \
  http://127.0.0.1:54321/functions/v1/product-context
```

Promote the first manager as the platform admin:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <platform-admin-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","user_id":"<target-auth-user-uuid>"}' \
  http://127.0.0.1:54321/functions/v1/admin-promote-manager
```

Expected: response body uses the shared `{ "data": ..., "error": null }` envelope and returns role `manager`.

## Manual Cross-Chunk Smoke

Use `supabase functions serve` plus the frontend or curl requests to verify these flows:

- Admin bootstrap: unauthenticated `product-context` resolves Eden from an allowed localhost origin; invalid origins return 403; an authenticated caller gets or creates a `product_users` row.
- Manager schedule generation: manager creates a class template, creates a weekly schedule, previews dates, activates or runs `schedule-generate`, and sees concrete published classes created without duplicates.
- User registration: user lists eligible concrete classes, registers, sees `pending` or `approved` according to class policy, and cannot register for started, completed, cancelled, full, or past classes.
- Stock restoration: stock membership registration consumes one stock unit; user cancellation before class start restores stock and writes membership ledger events.
- Attendance: manager starts a class, approved registrations become participants, registration is blocked after start, manager marks attendance, adds a walk-in product user, adds a trial attendee, and completes the class.

Record any environment-only verification gaps in `.symphony/blocked.json`; do not mark work ready when product failures remain unresolved.
