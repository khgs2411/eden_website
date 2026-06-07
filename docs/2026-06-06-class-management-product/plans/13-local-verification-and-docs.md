# Chunk 13: Local Verification And Docs

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-product-role-foundation.md` through `12-frontend-manager-membership-attendance.md`
**Enables:** reliable handoff to execution and future products

## Goal

Consolidate local seeds, smoke scripts or documented commands, README/env updates, Supabase reset/function validation, and final cross-chunk regression checks so the product can be operated locally and reused by future product websites.

## Source Artifacts

- Root and schedule specs.
- `README.md`, `.env.example`, `package.json`, `supabase/config.toml`.
- All prior chunk outputs.

## Relationships

- **Depends on:** all schema, API, and frontend chunks.
- **Enables:** final verification and future execution handoff.
- **Shared contracts:** local product key, env vars, smoke command list.
- **Integration points:** Supabase local stack, Vite dev/build, Edge Functions.

## File Responsibility Map

**Create:**
- `docs/2026-06-06-class-management-product/local-verification.md` - final smoke checklist.
- optional `supabase/seed.sql` updates if not completed earlier.

**Modify:**
- `README.md` - product local setup and verification.
- `.env.example` - product key and Supabase function settings.
- `package.json` - add scripts only if they wrap existing commands without hiding failures.

**Test:**
- Full local reset/function/frontend smoke commands.

## Implementation Tasks

### Task 1: Document local environment

- [ ] Update `.env.example` with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_PRODUCT_KEY=eden`
- [ ] If `.env.example` already exists, preserve existing keys and append `VITE_PRODUCT_KEY=eden`.
- [ ] Update `README.md` with Supabase start/reset/function serve/dev server flow.
- [ ] Document that frontend product APIs use Edge Functions only.

### Task 2: Consolidate seed and bootstrap notes

- [ ] Ensure Eden product and localhost origins are seeded.
- [ ] Document how to create/sign in a local platform admin and promote the first manager.
- [ ] Do not commit real user IDs or secrets.

### Task 3: Write final verification doc

- [ ] Add `local-verification.md` with exact command order:
  - `rtk supabase status`
  - `rtk supabase start` when needed
  - `supabase db reset`
  - `supabase migration list`
  - `supabase db lint`
  - `supabase functions serve`
  - `npm run lint`
  - `npm run build`
- [ ] Include manual smoke scenarios for admin bootstrap, manager schedule generation, user registration, stock restoration, and attendance.

## Verification

- Run: `rtk supabase status`
  - Expected: stack running or clear instruction to start it.
- Run: `supabase db reset`
  - Expected: all migrations and seed apply.
- Run: `supabase migration list`
  - Expected: all product migrations applied locally.
- Run: `supabase db lint`
  - Expected: no fatal findings; warnings reviewed.
- Run: `npm run lint`
  - Expected: no lint errors.
- Run: `npm run build`
  - Expected: production build succeeds.

## Acceptance Criteria Covered

- Local Supabase verification path exists.
- API boundaries and env setup are documented.
- Product is reusable by future websites.

## Risks And Rollback

- Docs can drift from actual commands. Verify commands during this chunk.
- Rollback by reverting docs/scripts only; product code remains intact.

## Non-Goals

- New product behavior.
- Deployment automation.
- Remote Supabase project migration.

## Type And Name Consistency

Use the approved glossary in `CONTEXT.md` and do not reintroduce legacy lesson-management terms as product concepts.
