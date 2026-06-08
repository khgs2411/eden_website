# Chunk 12: Final Docs And Handoff

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `11-eden-reintegration.md`
**Enables:** future package reuse and moving the Supabase Project out of this repository

## Goal

Update documentation and handoff notes so the extracted product can be operated in this repo, reused by future React/ShadCN/Tailwind Consumer Websites, and moved to its own backend folder/repo later without rediscovering the boundaries.

## Source Artifacts

- Spec sections: Acceptance Criteria, Verification Strategy, Planning Boundary Guidance.
- Agenda decisions: Q1 through Q8.
- ADRs: `docs/adr/0003-nested-supabase-project-boundary.md`, `docs/adr/0004-local-workspace-frontend-package.md`.
- Code paths: `README.md`, `backend/README.md`, `apps/class-management-playground/README.md`, `packages/class-management-react/README.md`, `.env.example`, package/playground env examples.

## Relationships

- **Depends on:** Eden package reintegration.
- **Enables:** future backend extraction to a separate repo and future package consumers.
- **Shared contracts:** Consumer Website boundary, package API surface, backend command surface, seed users.
- **Integration points:** root docs, backend docs, package docs, playground docs, Eden docs.

## File Responsibility Map

**Create:**
- `packages/class-management-react/README.md`
- Optional: `docs/2026-06-08-class-management-extraction/handoff.md`

**Modify:**
- `README.md`
- `.env.example`
- `backend/README.md`
- `apps/class-management-playground/README.md`
- `docs/2026-06-08-class-management-extraction/spec.md` only if final implementation discovered wording that must be reconciled.
- `docs/2026-06-08-class-management-extraction/plan.md` - mark plan set execution status if the team tracks it there.

**Test:**
- Documentation command snippets match actual scripts.
- Final lint/build.
- Boundary scans.

## Implementation Tasks

### Task 1: Update root README

- [ ] Describe the repo as containing:
  - Eden website
  - nested Supabase Project under `backend/`
  - reusable class-management React package
  - playground app
- [ ] Keep GitHub Pages deployment instructions accurate for Eden.
- [ ] Add root command list for common workflows:
  - Eden dev/build/lint
  - package build
  - playground dev/build
  - backend local commands by changing into `backend/`
- [ ] State that Consumer Websites do not import backend source files.

### Task 2: Update environment examples

- [ ] Ensure root `.env.example` contains only Eden/public frontend variables needed by the Consumer Website.
- [ ] Ensure playground `.env.example` contains only playground/public frontend variables.
- [ ] Ensure backend secret/config notes live under `backend/` docs and are not mixed into Consumer Website env examples.
- [ ] Confirm seeded users are documented where local testing starts:
  - `admin@admin.local`
  - `eden@manager.local`
  - password `password`

### Task 3: Update backend docs

- [ ] In `backend/README.md`, document:
  - backend purpose and boundary
  - local start/status/migration/lint/function commands
  - seed flow
  - Edge Function list used by the frontend
  - how to move `backend/` out to a standalone folder/repo later
- [ ] Link ADR 0003.
- [ ] State that frontend consumers use Supabase URL, publishable key, Auth, and Edge Functions rather than importing backend files.

### Task 4: Add package README

- [ ] Create `packages/class-management-react/README.md` with:
  - package purpose
  - required peer/runtime assumptions: React, Supabase JS, Tailwind/ShadCN-compatible UI
  - client creation example
  - provider setup
  - Headless Core exports
  - Workflow Component exports
  - UI Primitive Adapter usage
  - Consumer Website boundary rules
- [ ] Keep examples short and aligned with actual exported names from the package.
- [ ] Do not include npm publish instructions unless package publication was implemented.

### Task 5: Update playground docs

- [ ] In `apps/class-management-playground/README.md`, verify:
  - setup steps match actual scripts
  - backend prerequisites are clear
  - seed users and product key are documented
  - smoke checklist reflects what chunk 10 actually validated
  - accepted non-blocking issues are listed with current status

### Task 6: Add final handoff

- [ ] Create `docs/2026-06-08-class-management-extraction/handoff.md` if useful for future sessions.
- [ ] Include:
  - final folder map
  - exact tested commands and results
  - smoke checks performed
  - remaining known risks
  - instructions for moving `backend/` out of the repo later
  - instructions for using the package in another React/ShadCN/Tailwind site

### Task 7: Run final boundary scans

- [ ] Run: `rtk rg -n "supabase\\.from\\(|supabase\\.rpc\\(" src packages/class-management-react/src apps/class-management-playground/src`
  - Expected: no product frontend table/RPC calls. Supabase Auth and `supabase.functions.invoke()` are allowed.
- [ ] Run: `rtk rg -n "backend/|supabase/functions|supabase/migrations" src packages/class-management-react/src apps/class-management-playground/src`
  - Expected: no Consumer Website imports from backend source files.
- [ ] Run: `rtk rg -n "@/components/product|@/lib/product" src`
  - Expected: no old embedded product imports.
- [ ] Run an unresolved-placeholder scan across `README.md`, `backend`, `packages/class-management-react`, `apps/class-management-playground`, and `docs/2026-06-08-class-management-extraction`.
  - Expected: no unresolved planning placeholders.

### Task 8: Final verification

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

Docs match actual scripts and folder boundaries. Final scans confirm Consumer Websites do not import backend source files or old embedded product internals. Final build and lint pass.

## Acceptance Criteria Covered

- Backend/package/playground/Eden responsibilities are documented.
- Future backend movement is planned and understandable.
- Future React/ShadCN/Tailwind Consumer Websites have package usage guidance.
- Final implementation evidence is captured.

## Risks And Rollback

- Documentation can drift if final scripts changed during execution. Verify every command snippet before marking this chunk complete.
- Roll back by reverting docs changed in this chunk; product implementation remains in earlier chunks.

## Non-Goals

- Publishing the package externally.
- Moving the backend out of this repo.
- Creating new product features.

## Type And Name Consistency

Use the glossary terms from `CONTEXT.md`: **Supabase Project**, **Consumer Website**, **Class Management Playground**, **Reusable Frontend Package**, **Headless Core**, **Workflow Component**, and **UI Primitive Adapter**.
