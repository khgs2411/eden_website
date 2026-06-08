# Eden Dance Website

Mobile-first React SPA for a dance brand landing page and local playground for the shared class-management product.

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

The Supabase backend lives in `backend/`. Run backend commands from that folder. Use `npm run supabase:start` only when `npm run supabase:status` shows the local stack is stopped. After the stack is running, copy the local API URL and publishable key into `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
VITE_PRODUCT_KEY=eden
```

`.env.local` is intentionally ignored by git. `.env.example` documents the committed shape.

## Class Management Product

The product uses one shared Supabase backend scoped by a public `product_key`. Eden's local product key is `eden`.

Frontend product APIs call Supabase Edge Functions only. Browser code should not call product tables or Postgres RPCs directly; RLS and grants remain database defense in depth behind the Edge Function boundary.

The local seed creates:

- `products.product_key = eden`
- allowed development origins for `http://localhost:5173` and `http://127.0.0.1:5173`
- `admin@admin.local` as a platform admin
- `eden@manager.local` as an active manager for the Eden product

Both seeded local users use the password `password`. Do not reuse these credentials outside local development.

## Verification

The final local smoke checklist is documented in `docs/2026-06-06-class-management-product/local-verification.md`.

Minimum regression checks:

```bash
cd backend
npm run supabase:status
npm run supabase:migrations
npm run supabase:db-lint
cd ..
npm run lint
npm run build
```

Run `npm run supabase:functions` from `backend/` for local Edge Function validation before exercising the product UI. `npm run supabase:reset` from `backend/` runs `supabase db reset` and is destructive to local data.

## Legacy Landing Page Data

The first local migration creates `public.lesson_signups` with insert-only access for anonymous and authenticated clients. The landing-page form inserts requests into that table. This legacy landing-page table is separate from the class-management product API boundary.
