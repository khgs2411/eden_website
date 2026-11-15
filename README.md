# Eden Dance Website

Mobile-first React SPA scaffold for a dance brand landing page with Tailwind CSS,
shadcn-style components, dark/light theme support, and local Supabase.

## Local Development

```bash
bun install --frozen-lockfile
npm run dev
```

The dev server uses `http://localhost:5175` with a strict port because ClassKit
registers that origin. Installation requires SSH read access to the private
`khgs2411/class-kit-sdk` repository. CI uses `CLASS_KIT_SDK_DEPLOY_KEY`.

The public site and ClassKit feedback do not require local Supabase. The legacy
signup integration, when used, expects:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
```

`.env.local` is intentionally ignored by git. `.env.example` documents the shape.

## Feedback requests

Open `#manage` to sign in with Google. Accounts with
`product_change_requests.manage` see the floating request button and the drawer's
My requests and sign-out actions. Invitations are managed in class-kit-admin.
The committed `.env.development` contains only the non-secret localhost product
hint. Production resolves the product from its origin.

Draft text, type, and context are stored per user and request in localStorage;
files stay in memory. Upload progress shows per-file states because the SDK does
not expose byte progress. Closing a pending submission preserves it in memory
for reopening and retry. Requests without a selected spot use null section and
label values while retaining URL, language, theme, and viewport context.

Run `npm test`, `npm run lint`, and `npm run build`. Tests use Bun and happy-dom
with isolated fake APIs; they never write to ClassKit. Native dialog focus,
375px layout, both themes, and he/en/ru still require real-browser checks.
Verify live filing and attachments in class-kit-admin with a manager account.

Deployment remains owner-controlled: merging and pushing `master` deploys
production. Feature commits alone do not deploy.

## Supabase

The first local migration creates `public.lesson_signups` with insert-only access
for anonymous and authenticated clients. The landing-page form inserts requests
into that table.
