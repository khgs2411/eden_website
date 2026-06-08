# Chunk 02: Supabase Project Extraction

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-baseline-product-smoke.md`
**Enables:** `10-playground-validation-and-hardening.md`, future movement of the Supabase Project

## Goal

Move the current root `supabase/` project into a first-class nested backend project under `backend/`, add backend-local command/docs surface, and prove Supabase CLI, migrations, seeds, and Edge Functions work from inside the backend boundary.

## Source Artifacts

- Spec sections: Backend Extraction Design, API Boundary, Verification Strategy.
- Agenda decisions: Q1, Q1A, Q3.
- Context terms: **Supabase Project**, **Consumer Website**.
- ADR: `docs/adr/0003-nested-supabase-project-boundary.md`.
- Code paths: `supabase/**`, `deno.lock`, `README.md`, `.env.example`.

## Relationships

- **Depends on:** baseline smoke has passed or pre-existing failures are explicitly accepted.
- **Enables:** decoupled backend verification and package/playground consumption.
- **Shared contracts:** Consumer Websites configure Supabase URL, publishable key, and product key; frontend never imports backend files.
- **Integration points:** Supabase CLI, local Docker containers, Edge Functions, migrations, seed file.

## File Responsibility Map

**Create:**
- `backend/README.md` - backend-local usage, commands, seeded users, verification.
- `backend/package.json` - backend-local scripts wrapping Supabase CLI commands.

**Move:**
- `supabase/` -> `backend/supabase/`

**Modify:**
- `README.md` - root docs point to backend project commands.
- `.env.example` - remains website-only unless backend env examples are needed.
- `docs/2026-06-08-class-management-extraction/baseline-smoke.md` - append post-move backend command evidence if useful.

**Test:**
- Supabase CLI commands from `backend/`.
- Edge Function serve/invoke behavior.

## Implementation Tasks

### Task 1: Create backend project shell

- [ ] Create `backend/README.md`:

```md
# Class Management Supabase Project

This folder is the local nested Supabase Project for the class-management product.
It owns database migrations, seed data, Edge Functions, backend SQL/RPC helpers, and backend verification.

## Local Commands

Run these from `backend/`.

```bash
npm run supabase:status
npm run supabase:migrations
npm run supabase:db-lint
npm run supabase:functions
```

`npm run supabase:reset` runs `supabase db reset` and is destructive to local data.

## Seeded Local Users

- `admin@admin.local` / `password`
- `eden@manager.local` / `password`

Do not reuse these credentials outside local development.
```
```

- [ ] Create `backend/package.json`:

```json
{
  "name": "class-management-supabase-project",
  "private": true,
  "type": "module",
  "scripts": {
    "supabase:status": "supabase status",
    "supabase:start": "supabase start",
    "supabase:reset": "supabase db reset",
    "supabase:migrations": "supabase migration list --local",
    "supabase:db-lint": "supabase db lint",
    "supabase:functions": "supabase functions serve"
  }
}
```

### Task 2: Move Supabase-owned files

- [ ] Run: `rtk git mv supabase backend/supabase`
  - Expected: `git status --short` shows `R`/rename entries for `supabase/**` to `backend/supabase/**`.
- [ ] Move `deno.lock` only if Supabase function serving from `backend/` requires it next to `backend/supabase/`.
  - Discovery command: run `cd backend && rtk supabase functions serve`.
  - If Deno dependency locking fails because `deno.lock` is expected at backend root, run `rtk git mv deno.lock backend/deno.lock`.
  - If serving works without moving it, keep `deno.lock` at root and record the observed behavior in `backend/README.md`.

### Task 3: Update root documentation

- [ ] In `README.md`, replace root Supabase commands with backend-local commands:

```md
The Supabase backend lives in `backend/`. Run backend commands from that folder:

```bash
cd backend
npm run supabase:status
npm run supabase:start
npm run supabase:migrations
npm run supabase:db-lint
```
```
```

- [ ] Keep root `.env.example` as Consumer Website config:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_PRODUCT_KEY=eden
```

### Task 4: Verify backend-local commands

- [ ] Run: `cd backend && rtk npm run supabase:status`
  - Expected: reports local Supabase status or stopped-state without looking for root `supabase/`.
- [ ] Run: `cd backend && rtk npm run supabase:migrations`
  - Expected: migration list includes class-management migrations through `20260608030000`.
- [ ] Run: `cd backend && rtk npm run supabase:db-lint`
  - Expected: exits 0; record known warnings if present.
- [ ] Run: `cd backend && rtk npm run supabase:functions`
  - Expected: Edge Functions compile and serve locally. Stop the process after confirming startup.

### Task 5: Verify function config coverage

- [ ] Confirm these function directories exist under `backend/supabase/functions/`:
  - `product-context`
  - `classes`
  - `register-class`
  - `templates`
  - `schedules`
  - `schedule-generate`
  - `memberships`
  - `manage-registrations`
  - `attendance`
  - `admin-promote-manager`
  - `manager-promote-manager`
- [ ] If `backend/supabase/config.toml` lacks `[functions.<name>] verify_jwt = false` entries for any locally invoked function that requires custom JWT/origin handling, add the missing entries and rerun function serving.

## Verification

- `cd backend && rtk npm run supabase:status` exits 0.
- `cd backend && rtk npm run supabase:migrations` exits 0 and sees expected migrations.
- `cd backend && rtk npm run supabase:db-lint` exits 0.
- `cd backend && rtk npm run supabase:functions` starts serving functions without Deno import/config errors.
- `rtk npm run lint` from repo root exits 0.
- `rtk npm run build` from repo root exits 0.

## Acceptance Criteria Covered

- Backend class-management files are owned by a backend folder boundary.
- Supabase local reset/migration/function workflows still work.
- Consumer Website does not depend on backend source files.

## Risks And Rollback

- Local Docker project state may still reference project id `eden_website`; do not rename project id in this chunk unless required by Supabase CLI.
- Roll back by moving `backend/supabase` back to root `supabase` and deleting `backend/package.json`/`backend/README.md`.

## Non-Goals

- Changing database schema.
- Changing Edge Function behavior.
- Creating the frontend package.
- Publishing or moving the backend to a separate repository.

## Type And Name Consistency

Use **Supabase Project** for the backend boundary. Keep Edge Function names unchanged.
