# Class Management Supabase Project

This folder is the local nested Supabase Project for the class-management product. It owns database migrations, seed data, Edge Functions, backend SQL/RPC helpers, and backend verification.

## Local Commands

Run these from `backend/`.

```bash
npm run supabase:status
npm run supabase:start
npm run supabase:migrations
npm run supabase:db-lint
npm run supabase:functions
```

`npm run supabase:reset` runs `supabase db reset` and is destructive to local data.

## Seeded Local Users

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

Do not reuse these credentials outside local development.

## Consumer Website Contract

Consumer Websites configure Supabase URL, publishable key, and product key. They should call product workflows through Edge Functions and should not import files from this backend project.
