# Chunk 10: Playground Validation And Hardening

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `02-supabase-project-extraction.md`, `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md`
**Enables:** `11-eden-reintegration.md`

## Goal

Use `apps/class-management-playground` as the first Consumer Website to validate the extracted Supabase Project and reusable frontend package end to end. This chunk proves that the product works outside Eden before Eden is reintroduced as a package consumer.

## Source Artifacts

- Spec sections: Acceptance Criteria, Standalone Mini App, Verification Strategy.
- Agenda decisions: Q1, Q5, Q7, Q8.
- Roadmap risks: baseline smoke gate, Supabase CLI command surface, package/backend contract.
- Code paths: `backend/`, `packages/class-management-react/`, `apps/class-management-playground/`, root `package.json`.

## Relationships

- **Depends on:** backend extraction and all package workflow chunks.
- **Enables:** Eden reintegration.
- **Shared contracts:** seeded users, Supabase Auth, Edge Function API names, `product_key`.
- **Integration points:** backend docs/scripts, package exports, playground env/config.

## File Responsibility Map

**Create:**
- `apps/class-management-playground/README.md`
- `apps/class-management-playground/.env.example`
- `backend/SMOKE.md` or `backend/docs/smoke.md` if backend docs folder exists after chunk 02.
- Optional: `apps/class-management-playground/src/smoke-checklist.md` only if the app uses docs-adjacent content; prefer README otherwise.

**Modify:**
- `apps/class-management-playground/src/App.tsx` - harden empty/loading/error states found during smoke testing.
- `packages/class-management-react/src/**` - fix package-level integration issues found by playground smoke testing.
- `backend/README.md` - link to the playground smoke flow if created in chunk 02.
- Root `package.json` - add or adjust validation scripts only if chunk 04 scripts are insufficient.

**Test:**
- Backend local command checks.
- Package and playground builds.
- Seeded auth login for both seeded users.
- Representative user and manager workflow smoke checks.

## Implementation Tasks

### Task 1: Confirm backend is running from the extracted boundary

- [ ] From the backend project folder, run the backend-local status command defined in chunk 02.
  - Expected: local Supabase stack is reachable.
- [ ] Run migration status/list command defined in chunk 02.
  - Expected: migrations are visible from the extracted backend folder.
- [ ] Run backend lint command defined in chunk 02.
  - Expected: exits 0 or reports known pre-existing warnings documented in backend docs.
- [ ] Serve or verify Edge Functions using the backend-local command surface.
  - Expected: functions used by the frontend are available.

### Task 2: Document playground configuration

- [ ] Add `apps/class-management-playground/.env.example` with only public/browser-safe values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_PRODUCT_KEY=eden`
- [ ] Add `apps/class-management-playground/README.md` with:
  - purpose of the playground
  - setup commands
  - seeded users: `admin@admin.local`, `eden@manager.local`, password `password`
  - validation sequence
  - rule that the playground consumes the backend only through Supabase Auth and Edge Functions

### Task 3: Run seeded auth smoke

- [ ] Start the playground with the script defined in chunk 04.
- [ ] Sign in as `eden@manager.local`.
  - Expected: product context loads for `eden`, role is `manager`, status is `active`.
- [ ] Sign out.
  - Expected: session clears without `Invalid Refresh Token` console errors.
- [ ] Sign in as `admin@admin.local`.
  - Expected: session succeeds and product context reflects global access if the current backend exposes it through `product-context`.
- [ ] Sign out.
  - Expected: session clears cleanly.

### Task 4: Run user workflow smoke

- [ ] In signed-out state, load public classes.
  - Expected: public listing loads or a clear empty state appears.
- [ ] In signed-in manager state, load user classes.
  - Expected: listing loads without frontend exceptions.
- [ ] If no classes exist, use manager schedule/template workflows to create or generate a class before registration smoke.
- [ ] Register for a public/member-allowed class using a signed-in eligible user where current seed data supports it.
  - Expected: registration response succeeds or returns a clear backend business-rule error.
- [ ] Cancel an existing registration where current data supports it.
  - Expected: cancel response succeeds or returns a clear backend business-rule error.

### Task 5: Run manager class/schedule smoke

- [ ] Create or update a class template.
  - Expected: template list refreshes and no package/Eden import errors occur.
- [ ] Create a schedule from that template.
  - Expected: schedule list refreshes.
- [ ] Preview schedule generation.
  - Expected: preview response is displayed.
- [ ] Generate classes.
  - Expected: generated classes appear in class list.
- [ ] Edit a generated class.
  - Expected: override behavior succeeds without mutating template/schedule defaults.
- [ ] Cancel a generated class.
  - Expected: class cancellation is reflected in list.
- [ ] List pending registrations and approve/reject one if current seed state has pending rows.
  - Expected: status changes or a clear empty state appears.

### Task 6: Run manager membership/attendance smoke

- [ ] Create or list membership types.
  - Expected: membership type list loads and create succeeds when valid input is supplied.
- [ ] Deactivate a membership type if a disposable test type exists.
  - Expected: type status refreshes to inactive or backend returns a clear business-rule error.
- [ ] Grant membership stock to a user if current seed state supports it.
  - Expected: grant list and ledger refresh.
- [ ] Upgrade a membership grant if current seed state supports it.
  - Expected: grant list and ledger refresh.
- [ ] Revoke membership grant if supported by current backend state.
  - Expected: grant status changes or backend returns a clear business-rule error.
- [ ] Open attendance workflow for a generated class.
  - Expected: attendance rows load.
- [ ] Start an attendance session.
  - Expected: class lifecycle changes to in-progress or backend returns a clear business-rule error.
- [ ] Mark one attendance row with `update_attendance`.
  - Expected: status persists after refresh.
- [ ] Add a walk-in attendee if a known user id is available.
  - Expected: participant list refreshes.
- [ ] Add a trial attendee.
  - Expected: participant list refreshes.
- [ ] Complete the attendance session.
  - Expected: class lifecycle changes to completed or backend returns a clear business-rule error.

### Task 7: Fix integration issues found by smoke

- [ ] Fix only extraction/integration defects in `packages/class-management-react`, `apps/class-management-playground`, or backend command docs.
- [ ] Do not redesign Eden in this chunk.
- [ ] Do not change backend product behavior unless the smoke failure proves a real backend defect required for the product to function.
- [ ] Record any accepted pre-existing backend/business-rule limitation in playground README or backend smoke docs.

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

The playground demonstrates the extracted package/backend contract across seeded auth, user workflows, manager class/schedule workflows, and manager membership/attendance workflows. Any failed smoke item is documented as either fixed, pre-existing, or explicitly blocked.

## Acceptance Criteria Covered

- Playground is the first Consumer Website.
- Package talks to the backend through Supabase Auth and Edge Functions.
- Eden reintegration is blocked until playground validation completes.
- Seeded local users are documented and usable.

## Risks And Rollback

- Some smoke items depend on data created by earlier smoke steps. Run them in order and reset local data only with explicit approval if needed.
- Roll back by reverting playground/package hardening changes from this chunk; backend extraction remains owned by chunk 02.

## Non-Goals

- Eden final UI.
- npm publication.
- Moving the backend out of this repository.
- Full automated E2E test suite.

## Type And Name Consistency

Use `class-management-playground` for the app name and refer to Eden as a Consumer Website, not the backend owner.
