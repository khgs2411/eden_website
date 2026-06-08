# Chunk 01: Baseline Product Smoke

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-supabase-project-extraction.md`, `03-remove-embedded-eden-product-ui.md`, `04-workspace-and-package-scaffold.md`

## Goal

Define and run a small pre-extraction smoke gate against the current embedded implementation. This chunk proves the present behavior before files move, so later failures can be classified as pre-existing product failures or extraction regressions.

## Source Artifacts

- Spec sections: Current Context, API Boundary, Verification Strategy, Acceptance Criteria.
- Agenda decisions: Q3 Edge Functions only, Q6 baseline smoke hard gate, Q8 behavior-preserving extraction.
- Context terms: **Supabase Project**, **Consumer Website**, **Product**, **Product User**, **Manager**.
- Code paths: `src/lib/product-api.ts`, `src/lib/product-context.tsx`, `src/components/product/**`, `supabase/seed.sql`, `supabase/functions/**`, `supabase/migrations/**`.

## Relationships

- **Depends on:** current `feature/classes` branch state.
- **Enables:** all extraction chunks.
- **Shared contracts:** seeded users `admin@admin.local` and `eden@manager.local` use password `password`; frontend product calls use Edge Functions.
- **Integration points:** local Supabase stack, Edge Functions, current Eden embedded product UI.

## File Responsibility Map

**Create:**
- `docs/2026-06-08-class-management-extraction/baseline-smoke.md` - records commands, expected signals, and actual baseline results.

**Modify:**
- None required for product code.

**Test:**
- Local Supabase auth, product context, class listing, and representative manager Edge Function calls.

## Implementation Tasks

### Task 1: Record the baseline smoke matrix

**Files:**
- Create: `docs/2026-06-08-class-management-extraction/baseline-smoke.md`

- [ ] Create the file with this content and fill only the `Actual` column while running commands:

```md
# Baseline Smoke

Date: 2026-06-08
Scope: Current embedded class-management implementation before extraction.

| Check | Command | Expected | Actual |
| --- | --- | --- | --- |
| Git state | `rtk git status --short --branch` | branch is `feature/classes`; no unrelated implementation edits are required for smoke |  |
| Frontend lint | `rtk npm run lint` | exits 0 |  |
| Frontend build | `rtk npm run build` | exits 0; Vite chunk-size warning is acceptable |  |
| Supabase status | `rtk supabase status` | local stack running or clear stopped-state action |  |
| Migration state | `rtk supabase migration list --local` | local migrations include class-management migrations through `20260608030000` |  |
| DB lint | `rtk supabase db lint` | exits 0; known extra warnings may be recorded |  |
| Admin auth login | password token request for `admin@admin.local` | HTTP 200 |  |
| Manager auth login | password token request for `eden@manager.local` | HTTP 200 |  |
| Product context | `product-context` with manager JWT | HTTP 200 with product `eden` and role `manager` |  |
| Public classes | `classes` action `list_public` | HTTP 200 with JSON API envelope |  |
| Manager templates | `templates` action `list` with manager JWT | HTTP 200 with JSON API envelope |  |
| Manager schedules | `schedules` action `list` with manager JWT | HTTP 200 with JSON API envelope |  |
| Manager memberships | `memberships` action `list_types` with manager JWT | HTTP 200 with JSON API envelope |  |
```

### Task 2: Run static and backend checks

- [ ] Run: `rtk git status --short --branch`
  - Expected: output starts with `* feature/classes...origin/feature/classes`; design/plan artifact changes may be present.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0. Existing Vite chunk-size warning is acceptable.
- [ ] Run: `rtk supabase status`
  - Expected: local stack is running. If stopped, run `rtk supabase start` before continuing.
- [ ] Run: `rtk supabase migration list --local`
  - Expected: local migration list includes `20260607112136`, `20260607132920`, `20260607134535`, `20260607143000`, `20260607153000`, `20260607160000`, `20260607170000`, `20260608010000`, `20260608020000`, and `20260608030000`.
- [ ] Run: `rtk supabase db lint`
  - Expected: exits 0. Record warnings instead of hiding them.

### Task 3: Verify seeded auth users

- [ ] Get the local publishable key from `rtk supabase status`.
- [ ] Run admin login, replacing `<publishable-key>`:

```bash
rtk curl -s -o /tmp/eden-admin-auth-check.json -w "%{http_code}" \
  -H "apikey: <publishable-key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.local","password":"password"}' \
  "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
```

Expected: prints `200`; `/tmp/eden-admin-auth-check.json` contains `access_token`.

- [ ] Run manager login, replacing `<publishable-key>`:

```bash
rtk curl -s -o /tmp/eden-manager-auth-check.json -w "%{http_code}" \
  -H "apikey: <publishable-key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"eden@manager.local","password":"password"}' \
  "http://127.0.0.1:54321/auth/v1/token?grant_type=password"
```

Expected: prints `200`; `/tmp/eden-manager-auth-check.json` contains `access_token`.

### Task 4: Verify representative Edge Function product calls

- [ ] Extract the manager access token manually from `/tmp/eden-manager-auth-check.json` or with a safe local helper.
- [ ] Run product context:

```bash
rtk curl -s -i \
  -H "Origin: http://localhost:5173" \
  -H "Authorization: Bearer <manager-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"product_key":"eden"}' \
  http://127.0.0.1:54321/functions/v1/product-context
```

Expected: HTTP 200 and JSON with `data.product.product_key` equal to `eden` and `data.product_user.role` equal to `manager`.

- [ ] Run public classes:

```bash
rtk curl -s -i \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"product_key":"eden","action":"list_public"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: HTTP 200 and JSON API envelope with `data.classes` array.

- [ ] Run manager list calls:

```bash
rtk curl -s -i -H "Origin: http://localhost:5173" -H "Authorization: Bearer <manager-jwt>" -H "Content-Type: application/json" -d '{"product_key":"eden","action":"list"}' http://127.0.0.1:54321/functions/v1/templates
rtk curl -s -i -H "Origin: http://localhost:5173" -H "Authorization: Bearer <manager-jwt>" -H "Content-Type: application/json" -d '{"product_key":"eden","action":"list"}' http://127.0.0.1:54321/functions/v1/schedules
rtk curl -s -i -H "Origin: http://localhost:5173" -H "Authorization: Bearer <manager-jwt>" -H "Content-Type: application/json" -d '{"product_key":"eden","action":"list_types"}' http://127.0.0.1:54321/functions/v1/memberships
```

Expected: each returns HTTP 200 and a JSON API envelope.

## Verification

- `rtk npm run lint` exits 0.
- `rtk npm run build` exits 0.
- `rtk supabase migration list --local` shows expected migrations.
- Seeded auth login returns HTTP 200 for both local users.
- Representative Edge Function smoke calls return HTTP 200.
- `docs/2026-06-08-class-management-extraction/baseline-smoke.md` records actual results.

## Acceptance Criteria Covered

- Pre-extraction baseline smoke checks pass before backend/frontend file movement.
- Current frontend product behavior is proven before extraction.
- Browser product workflow remains Edge-Function-based.

## Risks And Rollback

- If any smoke check fails, stop extraction. Fix the pre-existing issue or record explicit user acceptance before proceeding.
- `supabase db reset` is not part of this chunk by default because it is destructive.

## Non-Goals

- Moving files.
- Refactoring frontend code.
- Creating workspace packages.
- Full manual QA of every product workflow.

## Type And Name Consistency

Use function names exactly: `product-context`, `classes`, `templates`, `schedules`, `memberships`. Use product key `eden` and seeded accounts exactly as specified.
