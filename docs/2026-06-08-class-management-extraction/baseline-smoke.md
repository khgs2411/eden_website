# Baseline Smoke

Date: 2026-06-08
Scope: Current embedded class-management implementation before extraction.

| Check | Command | Expected | Actual |
| --- | --- | --- | --- |
| Git state | `rtk git status --short --branch` | branch is `feature/classes`; no unrelated implementation edits are required for smoke | `* eden_website/wave-a-class-management-extraction-01-baseline-product-smoke-rMq6`; clean working tree before this smoke record was added. |
| Frontend lint | `rtk npm run lint` | exits 0 | Initial run failed because `node_modules` was absent and npm fell back to global ESLint 6.4.0. After `rtk npm ci`, exits 0. |
| Frontend build | `rtk npm run build` | exits 0; Vite chunk-size warning is acceptable | Initial run failed because `tsc` was absent. After `rtk npm ci`, exits 0. No chunk-size warning. |
| Supabase status | `rtk supabase status` | local stack running or clear stopped-state action | `rtk supabase status` failed because `supabase` is not on `PATH`. `rtk npx supabase status` reached Supabase CLI 2.105.0 but failed: cannot connect to Docker daemon at `unix:///var/run/docker.sock`. |
| Migration state | `rtk supabase migration list --local` | local migrations include class-management migrations through `20260608030000` | `rtk supabase migration list --local` failed because `supabase` is not on `PATH`. `rtk npx supabase migration list --local` failed because local Postgres at `127.0.0.1:54322` refused connection. Not completed. |
| DB lint | `rtk supabase db lint` | exits 0; known extra warnings may be recorded | `rtk supabase db lint` failed because `supabase` is not on `PATH`. `rtk npx supabase db lint` failed because local Postgres at `127.0.0.1:54322` refused connection. Not completed. |
| Admin auth login | password token request for `admin@admin.local` | HTTP 200 | Not completed; local Supabase stack is unavailable because Docker daemon is not reachable. |
| Manager auth login | password token request for `eden@manager.local` | HTTP 200 | Not completed; local Supabase stack is unavailable because Docker daemon is not reachable. |
| Product context | `product-context` with manager JWT | HTTP 200 with product `eden` and role `manager` | Not completed; manager login/JWT could not be obtained because local Supabase stack is unavailable. |
| Public classes | `classes` action `list_public` | HTTP 200 with JSON API envelope | Not completed; local Supabase functions are unavailable because the local stack is unavailable. |
| Manager templates | `templates` action `list` with manager JWT | HTTP 200 with JSON API envelope | Not completed; manager login/JWT could not be obtained because local Supabase stack is unavailable. |
| Manager schedules | `schedules` action `list` with manager JWT | HTTP 200 with JSON API envelope | Not completed; manager login/JWT could not be obtained because local Supabase stack is unavailable. |
| Manager memberships | `memberships` action `list_types` with manager JWT | HTTP 200 with JSON API envelope | Not completed; manager login/JWT could not be obtained because local Supabase stack is unavailable. |

## Notes

- `rtk npm ci` was required before static checks because this worktree did not have `node_modules`.
- Plain `rtk supabase ...` is not available in this environment. `rtk npx supabase --version` returns `2.105.0`, so Supabase CLI can be reached through `npx`.
- Supabase runtime checks are blocked by the local environment: `rtk npx supabase status` cannot connect to Docker, and local Postgres on `127.0.0.1:54322` is not accepting connections.
- Extraction remains blocked until the Supabase baseline smoke can run against a reachable local stack or these failures are accepted as environment-only by human review.
