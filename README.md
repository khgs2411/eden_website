# Eden Dance Website

Mobile-first React SPA for Eden plus local workspace boundaries for the shared class-management product.

## Repository Shape

- `src/`: Eden Consumer Website. It owns the branded landing page and Eden-specific class-management composition.
- `backend/`: nested Supabase Project. It owns migrations, seed data, Edge Functions, backend SQL/RPC helpers, and backend verification docs.
- `packages/class-management-react/`: private local Reusable Frontend Package for React Consumer Websites.
- `apps/class-management-playground/`: Class Management Playground used to exercise the package outside Eden's website shell.

Consumer Websites configure Supabase URL, publishable key, and product key. They do not import files from `backend/`, `backend/supabase/functions`, or `backend/supabase/migrations`.

## Local Development

```bash
npm install
cp .env.example .env.local
cd backend
npm run supabase:status
npm run supabase:start
npm run supabase:migrations
npm run supabase:db-lint
cd ..
npm run dev
```

Use `npm run supabase:start` only when `npm run supabase:status` shows the local stack is stopped. After the stack is running, copy the local API URL and publishable key into `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
VITE_PRODUCT_KEY=eden
```

`.env.local` is intentionally ignored by git. `.env.example` contains only browser-visible Consumer Website variables.

## Commands

- `npm run dev`: start Eden locally.
- `npm run build`: type-check and build Eden for production.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: serve Eden's built `dist/` output.
- `npm run build:package`: build `@eden/class-management-react`.
- `npm run dev:playground`: start the Class Management Playground.
- `npm run build:playground`: build the Class Management Playground.

Backend commands are run from `backend/`:

- `npm run supabase:status`
- `npm run supabase:start`
- `npm run supabase:migrations`
- `npm run supabase:db-lint`
- `npm run supabase:functions`
- `npm run supabase:reset`, which is destructive to local data.

## GitHub Pages

GitHub Pages deployment builds the Eden Consumer Website from the repository root and deploys `dist/` on pushes to `master`. The deployment does not require Supabase secrets; public runtime values are supplied through Vite environment variables.

## Class Management Product

The product uses one shared Supabase backend scoped by a public `product_key`. Eden's local product key is `eden`.

Browser product workflows call Supabase Edge Functions through the Reusable Frontend Package. Browser code may use Supabase Auth for session, sign-in, and sign-out. It should not call product tables with `supabase.from()` or product RPCs with `supabase.rpc()`.

The local seed creates:

- `products.product_key = eden`
- allowed development origins for `http://localhost:5173` and `http://127.0.0.1:5173`
- `admin@admin.local` as a platform admin
- `eden@manager.local` as an active manager for the Eden product

Both seeded local users use the password `password`. Do not reuse these credentials outside local development.

## Verification

Backend smoke details live in `backend/SMOKE.md`. Playground smoke details live in `apps/class-management-playground/README.md`. Final extraction handoff notes live in `docs/2026-06-08-class-management-extraction/handoff.md`.

Minimum regression checks:

```bash
npm run build:package
npm run build:playground
npm run lint
npm run build
```

Run `npm run supabase:functions` from `backend/` for local Edge Function validation before exercising the product UI.

## Legacy Landing Page Data

The first local migration creates `public.lesson_signups` with insert-only access for anonymous and authenticated clients. The landing-page form inserts requests into that table. This legacy landing-page table is separate from the class-management product API boundary.
