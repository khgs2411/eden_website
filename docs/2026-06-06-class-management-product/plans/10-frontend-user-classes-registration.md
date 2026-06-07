# Chunk 10: Frontend User Classes Registration

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `09-frontend-product-auth-shell.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md`
**Enables:** end-to-end user workflow validation

## Goal

Build user-facing class discovery and registration UI: visible concrete class listing, class details, registration request/cancel flows, pending/approved status display, and membership-aware messaging.

## Source Artifacts

- Root spec: Classes, Registration + Membership Interaction.
- Schedule spec: generated classes are concrete/published by default.
- Context: Class, Member, Product User.
- Code paths: product shell from Chunk 09.

## Relationships

- **Depends on:** product API wrapper, class listing API, registration API.
- **Enables:** manual user workflow validation.
- **Shared contracts:** class card view model, registration status, class visibility rules.
- **Integration points:** `src/components/product/*`, Edge Functions `classes`, `register-class`.

## View Model Contract

User class list items consume this API/view model:

```ts
type UserClassSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  capacity: number;
  approved_count: number;
  visibility: "public" | "hidden" | "members_only";
  registration_policy: "auto_approve" | "member_auto_approve" | "approval_required";
  membership_requirement: "none" | "required";
  user_registration: { id: string; status: "pending" | "approved" | "rejected" | "cancelled" } | null;
};
```

## File Responsibility Map

**Create:**
- `src/components/product/user/class-list.tsx` - class discovery list.
- `src/components/product/user/class-detail.tsx` - selected class detail and registration action.
- `src/components/product/user/registration-status.tsx` - pending/approved/cancelled status display.

**Modify:**
- `src/components/product/product-shell.tsx` - mount user workflow.
- `src/i18n.ts` - user class/registration copy.

**Test:**
- `npm run lint`, `npm run build`.

## Implementation Tasks

### Task 1: Add class discovery

- [ ] Fetch concrete classes through Edge Function only.
- [ ] Show only returned classes; do not reproduce authorization logic in UI.
- [ ] Display start/end time, location, capacity availability, visibility/member messaging, and registration status when available.

### Task 2: Add registration/cancellation actions

- [ ] Register button calls `register-class`.
- [ ] Cancel button calls cancellation route from the same API contract.
- [ ] Show pending/approved/rejected/cancelled states.
- [ ] Handle membership-required and approval-required errors as user-facing messages.

### Task 3: Preserve layout and locale behavior

- [ ] Use existing layout primitives and theme/locale conventions.
- [ ] Avoid turning the product UI into a marketing landing page.

## Verification

- Run: `npm run lint`
  - Expected: no lint errors.
- Run: `npm run build`
  - Expected: build passes.
- Manual smoke with local Edge Functions:
  - User sees generated published classes.
  - User registers and sees pending or approved state according to policy.
  - User cancels before start and UI updates.

## Acceptance Criteria Covered

- Users can view eligible classes.
- Users can register according to policy.
- Membership requirement/policy messages are visible.

## Risks And Rollback

- UI may accidentally imply direct DB permissions. Keep all data flow through `product-api`.
- Rollback by removing user workflow mount from product shell.

## Non-Goals

- Manager workflows.
- Attendance.
- Payments.

## Type And Name Consistency

Use `Class` for registerable items. Do not expose templates or schedules as registrable.
