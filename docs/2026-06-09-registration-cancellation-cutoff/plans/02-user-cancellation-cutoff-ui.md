# Chunk 02: User Cancellation Cutoff UI

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-backend-cancellation-cutoff.md`
**Enables:** End-to-end user cancellation cutoff validation

## Goal

Update the reusable class-management React package and playground documentation so users with live registrations can see when cancellation is closed and cannot submit normal UI cancellation after the backend cutoff.

## Source Artifacts

- Spec sections: User-Facing Behavior, Frontend Contract, Error Handling, Testing Strategy.
- Agenda decisions: Question 4, plus backend enforcement from Question 3.
- Backend contract from Chunk 01: `registration_cancellation_cutoff_hours`, `can_cancel_registration`, `registration_cancellation_closed`.
- Code paths:
  - `packages/class-management-react/src/types.ts`
  - `packages/class-management-react/src/components/user/class-detail.tsx`
  - `packages/class-management-react/src/components/user/class-list.tsx`
  - `apps/class-management-playground/README.md`
  - `package.json`

## Relationships

- **Depends on:** Backend class summaries include `can_cancel_registration` and `registration_cancellation_cutoff_hours`.
- **Enables:** Manual playground validation of before-cutoff and after-cutoff user states.
- **Shared contracts:** `UserClassSummary.can_cancel_registration`, `UserClassSummary.registration_cancellation_cutoff_hours`.
- **Integration points:** Package build, playground build, root lint/build, manual smoke flow.

## File Responsibility Map

**Create:**
- None.

**Modify:**
- `packages/class-management-react/src/types.ts` - add cancellation cutoff fields to `UserClassSummary`.
- `packages/class-management-react/src/components/user/class-detail.tsx` - render disabled/replaced cancel state with explanatory label.
- `packages/class-management-react/src/components/user/class-list.tsx` - map cutoff backend error to user-facing message and pass labels.
- `apps/class-management-playground/README.md` - add cutoff scenario to user workflow smoke notes.

**Test / Verify:**
- Package/playground static build and root lint/build.

## Implementation Tasks

### Task 1: Extend class summary types

**Files:**
- Modify: `packages/class-management-react/src/types.ts`

- [ ] **Step 1: Add fields to `UserClassSummary`**

```ts
export type UserClassSummary = {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	starts_at: string;
	ends_at: string;
	location: string | null;
	capacity: number;
	approved_count?: number;
	visibility: ClassVisibility;
	registration_policy: RegistrationPolicy;
	membership_requirement: MembershipRequirement;
	registration_cancellation_cutoff_hours: number;
	can_cancel_registration: boolean;
	user_registration: { id: string; status: RegistrationStatus } | null;
};
```

### Task 2: Render cancellation-closed state in class detail

**Files:**
- Modify: `packages/class-management-react/src/components/user/class-detail.tsx`

- [ ] **Step 1: Add labels**

Extend `ClassDetailLabels.actions`:

```ts
	actions?: {
		register?: string;
		cancel?: string;
		cancellationClosed?: string;
		working?: string;
	};
```

Extend `defaultLabels.actions`:

```ts
	actions: {
		register: "Register",
		cancel: "Cancel registration",
		cancellationClosed: "Cancellation is closed for this class.",
		working: "Working...",
	},
```

- [ ] **Step 2: Gate cancellation with `can_cancel_registration`**

Replace the current `canCancel` calculation:

```ts
	const hasLiveRegistration = registration?.status === "pending" || registration?.status === "approved";
	const canCancel = hasLiveRegistration && selectedClass.can_cancel_registration;
```

- [ ] **Step 3: Render disabled/replaced state**

Replace the action block with this behavior:

```tsx
			<div className="mt-4 flex flex-wrap gap-2">
				{hasLiveRegistration && registration ? (
					canCancel ? (
						<Button type="button" variant="outline" onClick={() => onCancel(registration.id)} disabled={actionPending}>
							{actionPending ? labels.actions.working : labels.actions.cancel}
						</Button>
					) : (
						<Button type="button" variant="outline" disabled>
							{labels.actions.cancellationClosed}
						</Button>
					)
				) : (
					<Button type="button" onClick={() => onRegister(selectedClass.id)} disabled={actionPending || Boolean(registration)}>
						{actionPending ? labels.actions.working : labels.actions.register}
					</Button>
				)}
			</div>
```

If the UI adapter's `Button` text becomes too long in the disabled state, render a short disabled button plus a nearby text message instead. Preserve the invariant: no clickable cancel after cutoff, and the user sees why.

### Task 3: Map backend cutoff errors in the class list

**Files:**
- Modify: `packages/class-management-react/src/components/user/class-list.tsx`

- [ ] **Step 1: Extend error labels**

Add `cancellationClosed`:

```ts
	errors?: {
		membershipRequired?: string;
		membershipStockDepleted?: string;
		capacityFull?: string;
		notRegisterable?: string;
		cancellationClosed?: string;
	};
```

Add the default label:

```ts
		cancellationClosed: "Cancellation is closed for this class.",
```

- [ ] **Step 2: Map backend error message**

Update `registrationMessageKey`:

```ts
	if (errorMessage.includes("registration_cancellation_closed") || errorMessage.includes("Cancellation is closed")) return "cancellationClosed";
```

Keep existing mappings unchanged.

### Task 4: Update playground smoke documentation

**Files:**
- Modify: `apps/class-management-playground/README.md`

- [ ] **Step 1: Expand user workflow smoke step**

Update the user workflow line to include the cutoff case:

```md
7. User workflow: load classes, register for a valid class when seed/current data supports it, cancel a registration before the product cancellation cutoff, then verify a live registration inside the cutoff still shows its status but displays cancellation-closed messaging instead of a working cancel action.
```

## Verification

Run from repository root:

```bash
rtk npm run build:package
```

Expected: package TypeScript build exits 0.

Run:

```bash
rtk npm run build:playground
```

Expected: playground build exits 0.

Run:

```bash
rtk npm run lint
```

Expected: ESLint exits 0.

Run:

```bash
rtk npm run build
```

Expected: root TypeScript/Vite build exits 0.

Manual playground smoke when local backend is available:

- Find or create a user registration for a class more than 24 hours away.
- Expected: `Cancel registration` is clickable and cancellation succeeds.
- Find or create a user registration for a class within 24 hours.
- Expected: registration status remains visible, cancellation-closed messaging appears, and no working cancel action is available.
- Submit a stale/direct cancel after cutoff if practical.
- Expected: backend returns cancellation-closed error and UI displays the mapped message.

## Acceptance Criteria Covered

- UI disables or replaces `Cancel registration` after cutoff.
- UI continues showing pending/approved registration status after cutoff.
- UI maps stale backend cutoff errors to a clear message.
- Playground smoke docs include before-cutoff and after-cutoff coverage.

## Risks And Rollback

- Risk: disabled button text may be too long in compact host UI adapters. Use adjacent explanatory text if needed.
- Rollback: remove the UI field reads and return to status-only cancel rendering; backend enforcement can remain independently.

## Non-Goals

- Live countdown timers.
- Manager UI for editing cutoff hours.
- Eden marketing-site translation updates outside the reusable package.
- Reintegrating the package into the Eden website shell.

## Type And Name Consistency

Use exactly:

- `UserClassSummary.can_cancel_registration`
- `UserClassSummary.registration_cancellation_cutoff_hours`
- `cancellationClosed`
- `registration_cancellation_closed`
