# Class Management Backend Smoke Checks

Run backend checks from this folder. The playground consumes this backend through Supabase Auth and Edge Functions only.

## Backend Commands

```bash
npm run supabase:status
npm run supabase:migrations
npm run supabase:db-lint
npm run supabase:functions
```

Expected result:

- The local Supabase stack is reachable.
- Migrations are visible from the nested `backend/` project boundary.
- Database lint exits 0 or reports only documented pre-existing warnings.
- Edge Functions used by the package can be served locally.

`npm run supabase:reset` is destructive to local data. Use it only when local data loss is acceptable.

## Seeded Auth

Seeded local users:

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

Use the local anon/publishable key from `npm run supabase:status` in `apps/class-management-playground/.env.local`.

## Playground Flow

After backend checks pass, run the Consumer Website smoke flow documented in `../apps/class-management-playground/README.md`.

Classify each smoke item as:

- `pass`
- `blocked`
- `pre-existing backend/business-rule limitation`
- `fixed in this chunk`

Do not change backend product behavior during playground validation unless a smoke failure proves a real defect required for the extracted package to function.
