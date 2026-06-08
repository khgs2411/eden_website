# Baseline Smoke

Date: 2026-06-08
Scope: Current embedded class-management implementation before extraction.

| Check | Command | Expected | Actual |
| --- | --- | --- | --- |
| Git state | `rtk git status --short --branch` | branch is `feature/classes`; no unrelated implementation edits are required for smoke | Worker branch and reviewer branch were clean during smoke. Reviewer worktree: `* HEAD (no branch)` before reviewer fix; `review/wave-a-baseline-smoke` after reviewer fix. |
| Frontend lint | `rtk npm run lint` | exits 0 | Worker: passed after `rtk npm ci`. Reviewer: passed after `rtk npm ci`. |
| Frontend build | `rtk npm run build` | exits 0; Vite chunk-size warning is acceptable | Worker: passed after `rtk npm ci`. Reviewer: passed after `rtk npm ci`; no chunk-size warning. |
| Supabase status | `rtk supabase status` | local stack running or clear stopped-state action | Reviewer: exits 0. Local development setup is running at `http://127.0.0.1:54321`; database URL is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. |
| Migration state | `rtk supabase migration list --local` | local migrations include class-management migrations through `20260608030000` | Reviewer: exits 0. Local migration list includes all required migrations through `20260608030000`. |
| DB lint | `rtk supabase db lint` | exits 0; known extra warnings may be recorded | Reviewer: exits 0. Warnings recorded for unused parameters in `private.consume_registration_stock` and never-read variable `v_product_user` in `public.register_for_class`. |
| Admin auth login | password token request for `admin@admin.local` | HTTP 200 | Reviewer: HTTP 200; response contains `access_token`. |
| Manager auth login | password token request for `eden@manager.local` | HTTP 200 | Reviewer: HTTP 200; response contains `access_token`. |
| Product context | `product-context` with manager JWT | HTTP 200 with product `eden` and role `manager` | Reviewer: HTTP 200; response has `data.product.product_key = eden`, `data.product_user.role = manager`, `data.product_user.status = active`, `error = null`. |
| Public classes | `classes` action `list_public` | HTTP 200 with JSON API envelope | Reviewer: HTTP 200; response has `{ data, error }`, `data.classes`, and `error = null`. |
| Manager templates | `templates` action `list` with manager JWT | HTTP 200 with JSON API envelope | Reviewer: HTTP 200; response has `{ data, error }`, `data.templates`, and `error = null`. |
| Manager schedules | `schedules` action `list` with manager JWT | HTTP 200 with JSON API envelope | Reviewer: HTTP 200; response has `{ data, error }`, `data.schedules`, and `error = null`. |
| Manager memberships | `memberships` action `list_types` with manager JWT | HTTP 200 with JSON API envelope | Reviewer: HTTP 200; response has `{ data, error }`, `data.membership_types`, and `error = null`. |

## Notes

- `rtk npm ci` was required before static checks because the worker/reviewer worktrees did not have `node_modules`.
- Worker environment could not reach Supabase CLI/Docker/Postgres, so Supabase runtime checks were completed by reviewer on the preserved branch in a local environment with Supabase access.
- Reviewer had to run Supabase CLI commands with host access because the CLI writes telemetry under the user Supabase directory.
- The pre-extraction baseline smoke gate is satisfied. Later extraction chunks can treat these results as the current behavior baseline.
