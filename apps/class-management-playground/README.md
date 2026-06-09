# Class Management Playground

Local Vite app for developing and smoke-testing the class-management React package outside the Eden website shell. This app is the first Consumer Website for the extracted class-management package.

The playground must consume the backend only through Supabase Auth and Edge Functions. Do not import files from `backend/` or call product tables/RPCs directly from this app.

## Configuration

Create `apps/class-management-playground/.env.local` from `.env.example` when local values differ.

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local anon key from backend Supabase status>
VITE_PRODUCT_KEY=eden
```

All values are browser-visible. Do not put service-role keys or secrets in this file.

## Commands

- `npm run dev:playground` from the repository root starts this app.
- `npm run build:playground` from the repository root builds this app.
- `npm run build -w apps/class-management-playground` is the package-local build command.

Backend commands are owned by `backend/`; see `backend/SMOKE.md`.

## Product Key

The playground is currently configured for the local Eden product with `VITE_PRODUCT_KEY=eden`.

## Seeded Users

Use these local-only accounts after the backend seed has been applied:

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

## Smoke Flow

Run this flow against the local backend and classify each item as `pass`, `blocked`, `pre-existing backend/business-rule limitation`, or `fixed in this chunk`.

1. Start the local Supabase stack from `backend/` and copy the anon/publishable key into `.env.local`.
2. Start the playground with `npm run dev:playground`.
3. Signed out: load the app and confirm public classes load, or a clear empty/error state is shown.
   - Expected contract: `product-context` returns the `eden` product with `product_user: null` before login. Supabase may send the anon/publishable key as an `Authorization` bearer on this request; that bearer is public configuration and must be treated as anonymous, not as an invalid user session.
4. Sign in as `eden@manager.local`; confirm product context loads for product `eden`, role `manager`, status `active`.
5. Sign out; confirm the session clears without refresh-token errors.
6. Sign in as `admin@admin.local`; confirm auth succeeds and product context either reflects global access or returns a clear backend response.
7. User workflow: load classes, register for a valid class when seed/current data supports it, cancel a registration before the product cancellation cutoff, then verify a live registration inside the cutoff still shows its status but displays cancellation-closed messaging instead of a working cancel action.
8. Manager class/schedule workflow: create or update a template, create a schedule, preview generation, generate classes, edit one generated class, cancel one generated class, list pending registrations, reject a pending registration where data supports it, then verify the rejected recovery controls can either approve the rejected registration or allow the user to re-register.
9. Manager membership/attendance workflow: list/create membership types, grant/upgrade/revoke membership stock where data supports it, open attendance for a generated class, start attendance, mark a row, add trial/walk-in attendees where supported, then complete attendance.
10. Run final static checks from the repository root:
    - `rtk npm run build:package`
    - `rtk npm run build:playground`
    - `rtk npm run lint`
    - `rtk npm run build`

## Current Validation Notes

- Static package/playground builds are the minimum verification for this chunk when the local Supabase CLI is unavailable.
- Backend and manual browser smoke checks require the Supabase CLI and a running local stack. If those tools are missing in a worker environment, record the gap as `verification_environment` rather than changing product behavior speculatively.
- Signed-out playground load is expected to pass the public product-context and public class-listing path without login. Auth-required manager/user mutation paths should still reject anonymous requests.
- No accepted product behavior limitations are documented for this final handoff. Treat new smoke failures as either environment blockers or defects to triage, not as silently accepted behavior.
