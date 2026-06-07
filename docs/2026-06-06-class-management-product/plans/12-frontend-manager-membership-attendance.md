# Chunk 12: Frontend Manager Membership Attendance

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `09-frontend-product-auth-shell.md`, `06-membership-ledger.md`, `08-attendance-engine.md`
**Enables:** manager membership and attendance validation

## Goal

Build manager UI for memberships and attendance: membership type/grant management, user membership upgrades/revokes, class start/completion, registered attendance, walk-ins, and trials.

## Source Artifacts

- Root spec: Memberships, attendance model.
- Root agenda: membership upgrade, ledger, attendance questions.
- Context: Member, Membership Ledger, Attendance, Walk-in, Trial.

## Relationships

- **Depends on:** product shell, memberships API, attendance API.
- **Enables:** end-to-end manager operations.
- **Shared contracts:** membership mode labels, grant status, attendance participant model.
- **Integration points:** Edge Functions `memberships`, `attendance`.

## View Model Contract

Membership mode labels map to backend modes exactly:

```ts
type MembershipMode = "stock" | "limited_stock" | "limited" | "infinite";
type ParticipantKind = "registered" | "walk_in" | "trial";
type AttendanceStatus = "present" | "absent";
```

## File Responsibility Map

**Create:**
- `src/components/product/manager/membership-types.tsx`
- `src/components/product/manager/membership-grants.tsx`
- `src/components/product/manager/attendance-session.tsx`
- `src/components/product/manager/trial-attendee-form.tsx`

**Modify:**
- `src/components/product/product-shell.tsx` - mount manager membership/attendance workflow.
- `src/i18n.ts` - membership/attendance copy.

**Test:**
- `npm run lint`, `npm run build`.

## Implementation Tasks

### Task 1: Membership management UI

- [ ] Manager creates/deactivates membership types.
- [ ] Manager grants membership to product user.
- [ ] Manager upgrades membership; UI explains old active grant is replaced.
- [ ] Show membership ledger history for selected user when API provides it.

### Task 2: Attendance session UI

- [ ] Manager selects an approved/upcoming class and starts it.
- [ ] Show registered participants.
- [ ] Mark present/absent.
- [ ] Add product-user walk-ins.
- [ ] Add trial attendees present by default.
- [ ] Complete class.

### Task 3: State and error handling

- [ ] Show backend validation errors for invalid membership grant, already-started class, duplicate participant, and impossible trial/walk-in states.
- [ ] Do not allow users to access manager screens.

## Verification

- Run: `npm run lint`
- Run: `npm run build`
- Manual smoke:
  - Manager creates membership type and grants it.
  - Manager upgrades user membership.
  - Manager starts class, marks attendance, adds walk-in, adds trial, completes class.

## Acceptance Criteria Covered

- Managers create memberships and grant them.
- Membership upgrades are visible.
- Attendance, walk-ins, and trials are supported.
- Manager-only access is preserved.

## Risks And Rollback

- Attendance UI can blur registration vs attendance. Keep labels explicit.
- Rollback by unmounting this workflow from product shell.

## Non-Goals

- Payments.
- Trial conversion to product user.
- Attendance analytics.

## Type And Name Consistency

Do not call trials walk-ins. A Walk-in is a Product User; a Trial is not.
