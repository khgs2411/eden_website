# Class Management Extraction Handoff

Date: 2026-06-08

## Final Folder Map

- `backend/`: nested Supabase Project with config, migrations, seed data, Edge Functions, backend package scripts, and backend smoke docs.
- `packages/class-management-react/`: private local Reusable Frontend Package with Headless Core, Workflow Components, types, and UI Primitive Adapter.
- `apps/class-management-playground/`: standalone Class Management Playground Consumer Website.
- `src/`: Eden Consumer Website using the package for class-management workflows.

## Boundary Contract

Consumer Websites configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PRODUCT_KEY`

Consumer Websites may use Supabase Auth and Edge Functions through the package. They should not import backend source files, `backend/supabase/functions`, or `backend/supabase/migrations`. Browser product workflows should not call product tables through `supabase.from()` or product RPCs through `supabase.rpc()`.

## Seeded Local Accounts

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

These accounts are local-only test data.

## Verification Commands

Final chunk verification run on 2026-06-08:

```bash
npm run build:package
npm run build:playground
npm run lint
npm run build
```

Result: all four commands exited 0. `npm run build` emitted Vite's non-fatal chunk-size warning for the Eden bundle.

Boundary scans were run with `grep -R` because `rg` was not installed in this worker environment:

```bash
grep -R -n -E "supabase\\.from\\(|supabase\\.rpc\\(" src packages/class-management-react/src apps/class-management-playground/src
grep -R -n -E "backend/|supabase/functions|supabase/migrations" src packages/class-management-react/src apps/class-management-playground/src
grep -R -n -E "@/components/product|@/lib/product" src
grep -R -n -E "TODO|TBD|fill in" README.md backend packages/class-management-react apps/class-management-playground docs/2026-06-08-class-management-extraction
```

Result: no matches.

Backend verification, when local Supabase is available, should run from `backend/`:

```bash
npm run supabase:status
npm run supabase:migrations
npm run supabase:db-lint
npm run supabase:functions
```

`npm run supabase:reset` is destructive to local data.

## Smoke Checks

Use `apps/class-management-playground/README.md` as the manual smoke checklist. It covers signed-out public load, seeded manager login, seeded admin login, user registration flows, manager class/schedule flows, membership flows, and attendance flows.

## Moving `backend/` Out Later

1. Move the full `backend/` folder, including `package.json` and `supabase/`.
2. Keep Supabase Edge Function names stable unless a separate API migration is planned.
3. Recreate or update local frontend `.env.local` files with the moved Supabase project's URL and publishable key.
4. Keep `VITE_PRODUCT_KEY=eden` for Eden unless the product key itself is intentionally migrated.
5. Re-run backend verification from the new backend folder and frontend build/lint checks from each Consumer Website.

## Reusing The Package In Another Site

1. Add the local workspace package or copy `packages/class-management-react/` into the target React workspace.
2. Install/provide peer dependencies: React, React DOM, and `@supabase/supabase-js`.
3. Ensure the host site has Tailwind-compatible CSS tokens or provides compatible styling.
4. Create a client with `createClassManagementClient()`.
5. Wrap workflows in `ProductProvider`.
6. Optionally wrap with `ClassManagementUiProvider` to map Button, Input, Textarea, and Label to host ShadCN-compatible primitives.
7. Keep host-specific copy, routing, and layout in the Consumer Website.

## Known Risks

- Manual browser smoke checks still require a running local Supabase stack and seeded data.
- The package is private and local-workspace only; publishing has not been implemented.
- Future backend movement should be treated as infrastructure work, not a product feature change.
