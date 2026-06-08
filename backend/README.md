# Class Management Supabase Project

This folder is the local nested Supabase Project for the class-management product. It owns database migrations, seed data, Edge Functions, backend SQL/RPC helpers, and backend verification.

The boundary decision is documented in `../docs/adr/0003-nested-supabase-project-boundary.md`. Treat this folder as a backend project that happens to live inside the Eden repository while the product is being proven.

## Local Commands

Run these from `backend/`.

```bash
npm run supabase:status
npm run supabase:start
npm run supabase:migrations
npm run supabase:db-lint
npm run supabase:functions
```

`npm run supabase:start` starts the local Supabase stack. `npm run supabase:reset` runs `supabase db reset` and is destructive to local data.

Smoke-check details live in `SMOKE.md`.

## Backend-Owned Files

- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/`
- `supabase/functions/`

Frontend Consumer Websites should not depend on these paths being next to them.

## Edge Functions

Frontend product workflows use these Edge Functions:

- `product-context`
- `classes`
- `register-class`
- `templates`
- `schedules`
- `schedule-generate`
- `memberships`
- `manage-registrations`
- `attendance`
- `admin-promote-manager`
- `manager-promote-manager`

`supabase/functions/_shared` contains backend-only shared function helpers.

## Seeded Local Users

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

Do not reuse these credentials outside local development.

## Consumer Website Contract

Consumer Websites configure Supabase URL, publishable key, and product key. They use Supabase Auth and call product workflows through Edge Functions. They should not import files from this backend project or call product tables/RPCs directly from browser code.

## Moving This Backend Later

To move the Supabase Project out of this repository later:

1. Move the entire `backend/` folder to the new backend location.
2. Keep its `package.json` scripts and `supabase/` folder together.
3. Update Consumer Website `.env.local` files to point at the moved project's Supabase URL and publishable key.
4. Keep the Edge Function names and `product_key` contract stable unless a separate backend migration plan changes them.
5. Re-run `npm run supabase:status`, `npm run supabase:migrations`, `npm run supabase:db-lint`, and local Edge Function smoke checks from the moved folder.
