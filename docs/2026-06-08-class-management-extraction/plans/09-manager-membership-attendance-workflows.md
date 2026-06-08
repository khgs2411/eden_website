# Chunk 09: Manager Membership And Attendance Workflows

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md`
**Enables:** `10-playground-validation-and-hardening.md`, `11-eden-reintegration.md`

## Goal

Extract manager membership type, membership grant, membership ledger, trial attendee, and attendance session workflows into package Workflow Components and expose them in the playground. This completes the current manager product surface after the class/schedule workflows.

## Source Artifacts

- Spec sections: Reusable Frontend Package Design, Standalone Mini App.
- Agenda decisions: Q3, Q4, Q6.
- Code paths: `src/components/product/manager/membership-types.tsx`, `src/components/product/manager/membership-grants.tsx`, `src/components/product/manager/trial-attendee-form.tsx`, `src/components/product/manager/attendance-session.tsx`, `src/components/product/manager/manager-api.ts`, `src/components/product/product-shell.tsx`.

## Relationships

- **Depends on:** Headless Core, UI Primitive Adapter, and user workflow context.
- **Enables:** full playground validation and Eden reintegration.
- **Shared contracts:** `memberships`, `attendance`, `classes` Edge Functions.
- **Integration points:** package UI adapter, `useClassManagementClient()`, `callManagerApi`.

## File Responsibility Map

**Create:**
- `packages/class-management-react/src/components/manager/membership-types.tsx`
- `packages/class-management-react/src/components/manager/membership-grants.tsx`
- `packages/class-management-react/src/components/manager/trial-attendee-form.tsx`
- `packages/class-management-react/src/components/manager/attendance-session.tsx`
- `packages/class-management-react/src/components/manager/manager-operations-dashboard.tsx`

**Modify:**
- `packages/class-management-react/src/index.ts` - export manager membership/attendance components.
- `apps/class-management-playground/src/App.tsx` - include the manager operations dashboard for active managers.
- `packages/class-management-react/src/manager/manager-api.ts` - add any missing membership/attendance exported types copied from current implementation.

**Test:**
- Package build.
- Playground build.
- Root lint/build.
- Manual playground smoke in chunk 10.

## Implementation Tasks

### Task 1: Extract membership type workflow

- [ ] Copy `src/components/product/manager/membership-types.tsx` to `packages/class-management-react/src/components/manager/membership-types.tsx`.
- [ ] Replace UI imports with `useClassManagementUi()`.
- [ ] Replace `@/components/product/manager/manager-api` imports with `../../manager/manager-api`.
- [ ] Replace translation dependency with local default labels or optional `labels` prop.
- [ ] Preserve membership type calls and action names exactly:
  - `memberships` action `list_types`
  - `memberships` action `create_type`
  - `memberships` action `deactivate_type`
- [ ] Ensure all calls use `callManagerApi(client, "memberships", ...)` with `client` from `useClassManagementClient()`.

### Task 2: Extract membership grant and ledger workflow

- [ ] Copy `src/components/product/manager/membership-grants.tsx` to `packages/class-management-react/src/components/manager/membership-grants.tsx`.
- [ ] Replace UI imports with `useClassManagementUi()`.
- [ ] Replace `@/components/product/manager/manager-api` imports with `../../manager/manager-api`.
- [ ] Replace translation dependency with local default labels or optional `labels` prop.
- [ ] Preserve membership grant and ledger calls and action names exactly:
  - `memberships` action `list_types`
  - `memberships` action `list_user_grants`
  - `memberships` action `list_ledger`
  - `memberships` action `grant`
  - `memberships` action `upgrade`
  - `memberships` action `revoke`
- [ ] Ensure all calls use `callManagerApi(client, "memberships", ...)` with `client` from `useClassManagementClient()`.

### Task 3: Extract trial attendee helper

- [ ] Copy `src/components/product/manager/trial-attendee-form.tsx` to `packages/class-management-react/src/components/manager/trial-attendee-form.tsx`.
- [ ] Replace UI imports with `useClassManagementUi()`.
- [ ] Replace translation dependency with local default labels or optional `labels` prop.
- [ ] Preserve the callback shape consumed by `AttendanceSession`:
  - `onAdd(trial: { trial_name: string; trial_contact: string | null })`

### Task 4: Extract attendance session workflow

- [ ] Copy `src/components/product/manager/attendance-session.tsx` to `packages/class-management-react/src/components/manager/attendance-session.tsx`.
- [ ] Replace UI imports with `useClassManagementUi()`.
- [ ] Replace manager API imports with package manager API imports.
- [ ] Replace `TrialAttendeeForm` import with the package-local `./trial-attendee-form`.
- [ ] Preserve attendance calls and action names exactly:
  - `attendance` action `list_class`
  - `attendance` action `start`
  - `attendance` action `update_attendance`
  - `attendance` action `add_walk_in`
  - `attendance` action `add_trial`
  - `attendance` action `complete`
- [ ] Preserve class lookup behavior used for attendance selection:
  - `classes` action `list_manager`
- [ ] Ensure all calls use `callManagerApi(client, functionName, body)`.

### Task 5: Fill manager API type gaps

- [ ] Compare current type exports in `src/components/product/manager/manager-api.ts` against the package `manager-api.ts`.
- [ ] Add exported package types needed by membership and attendance components, including `MembershipMode`, `MembershipType`, `MembershipGrant`, `MembershipLedgerEntry`, `ManagedClass`, `ClassParticipant`, `AttendanceStatus`, and `ParticipantKind`.
- [ ] Do not rename backend field names; preserve snake_case API fields in package types.

### Task 6: Add manager operations dashboard

- [ ] Create `packages/class-management-react/src/components/manager/manager-operations-dashboard.tsx`.
- [ ] Render `MembershipTypes`, `MembershipGrants`, and `AttendanceSession` in a simple grid or stacked layout using the UI adapter primitives.
- [ ] Maintain a `refreshKey` state and `onChanged` callback so membership type/grant changes can refresh dependent membership views.
- [ ] Pass the class/schedule refresh key from parent manager composition when available, or keep a local refresh key for attendance if this dashboard is standalone.
- [ ] Gate only on role/status supplied by the consumer; do not duplicate auth checks inside backend calls.

### Task 7: Wire playground operations dashboard

- [ ] Add `ManagerOperationsDashboard` to `apps/class-management-playground/src/App.tsx`.
- [ ] Show it only when `productUser?.role === "manager"` and `productUser.status === "active"`.
- [ ] Keep it visually separate from `ManagerClassDashboard` so class/schedule bugs and membership/attendance bugs are easier to isolate during smoke testing.

### Task 8: Verify

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

Package/playground build and lint pass. Playground displays membership and attendance manager workflows for the seeded manager session after login.

## Acceptance Criteria Covered

- Current membership type, membership grant/ledger, trial attendee, and attendance session surfaces are available through package Workflow Components.
- Playground can exercise membership, stock ledger, and attendance workflows.
- Package components do not import Eden-local product files.

## Risks And Rollback

- Membership and attendance workflows may depend on generated classes from chunk 08. If no classes exist, components should show empty states and chunk 10 should generate smoke data.
- In full-plan serial execution, run this chunk after chunk 08 so attendance validation can use generated class data from the class/schedule workflow.
- Roll back by removing membership/attendance package exports and playground dashboard import.

## Non-Goals

- Changing membership or attendance backend behavior.
- Reworking class generation or registration approval behavior.
- Eden reintegration.

## Type And Name Consistency

Use `MembershipTypes`, `MembershipGrants`, `TrialAttendeeForm`, `AttendanceSession`, and `ManagerOperationsDashboard`.
