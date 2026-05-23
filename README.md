# Eden Dance Website

Mobile-first React SPA scaffold for a dance brand landing page with Tailwind CSS,
shadcn-style components, dark/light theme support, and local Supabase.

## Local Development

```bash
npm install
supabase start
npm run dev
```

The app expects:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
```

`.env.local` is intentionally ignored by git. `.env.example` documents the shape.

## Supabase

The first local migration creates `public.lesson_signups` with insert-only access
for anonymous and authenticated clients. The landing-page form inserts requests
into that table.
