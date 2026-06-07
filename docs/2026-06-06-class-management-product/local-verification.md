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

2. Reset migrations and seeds:

```bash
supabase db reset
```

Expected seed state:

- `products` contains `product_key = eden`.
- `product_allowed_origins` contains `http://localhost:5173` and `http://127.0.0.1:5173`.
- No real user ids, JWTs, or secrets are committed.

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
