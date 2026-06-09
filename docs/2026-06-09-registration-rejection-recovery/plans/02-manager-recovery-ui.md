# Chunk 02: Manager Recovery UI

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-backend-registration-recovery.md`
**Enables:** End-to-end manager recovery smoke

## Goal

Expose rejected-registration recovery in the manager class workflow so managers can approve rejected registrations or explicitly allow re-registration from the UI.

## Source Artifacts

- Spec sections: User-Facing Behavior, Frontend Contract, Error Handling, Acceptance Criteria
- Agenda decisions: Questions 2, 3, and 4
- Context term: Registration Rejection Recovery in `CONTEXT.md`
- Code paths:
  - `packages/class-management-react/src/components/manager/pending-registrations.tsx`
  - `packages/class-management-react/src/components/manager/manager-class-dashboard.tsx`
  - `packages/class-management-react/src/manager/manager-api.ts`
  - `apps/class-management-playground/README.md`

## Relationships

- **Depends on:** Backend actions `approve_rejected` and `allow_reregister` from Chunk 01.
- **Enables:** Manager recovery workflow smoke in the playground.
- **Shared contracts:** `Registration.status`, `callManagerApi`, `manage-registrations` actions.
- **Integration points:** Manager class dashboard, generated classes list refresh behavior, playground build.

## File Responsibility Map

**Create:**

- No new file required unless implementation chooses to split a small `RejectedRegistrations` component for readability.

**Modify:**

- `packages/class-management-react/src/components/manager/pending-registrations.tsx` - load rejected registrations and render recovery actions near the pending queue.
- `packages/class-management-react/src/manager/manager-api.ts` - add `updated_at` and recovery metadata to `Registration` for filtering/display.
- `apps/class-management-playground/README.md` - add rejected-registration recovery to the manager smoke flow.

**Test / Verify:**

- Package, playground, lint, and root build commands from `package.json`.

## Implementation Tasks

### Task 1: Expand Registration Type

**Files:**

- Modify: `packages/class-management-react/src/manager/manager-api.ts`

- [ ] **Step 1: Include `updated_at` and recovery metadata on manager registration rows**

Update the `Registration` type so the manager UI can render stable current timestamps:

```ts
export type Registration = {
	id: string;
	class_id: string;
	user_id: string;
	status: "pending" | "approved" | "rejected" | "cancelled";
	stock_consumed: number;
	created_at: string;
	updated_at: string;
	rejected_at: string | null;
	rejected_by: string | null;
	rejection_recovered_at: string | null;
	rejection_recovered_by: string | null;
	rejection_recovery_action: "approve_rejected" | "allow_reregister" | null;
};
```

Keep these fields explicit because the recovery UI depends on them and `class_registrations` rows will include them after Chunk 01.

### Task 2: Add Rejected Recovery State And Loader

**Files:**

- Modify: `packages/class-management-react/src/components/manager/pending-registrations.tsx`

- [ ] **Step 1: Extend labels**

Add labels near the existing `labels` object:

```ts
	rejectedTitle: "Rejected registrations",
	rejectedEmpty: "No rejected registrations.",
	approveRejected: "Approve",
	allowReregister: "Allow re-register",
	recoveryMessage: "Rejected registration recovery updated.",
```

- [ ] **Step 2: Track rejected registrations**

Add state next to the existing `registrations` state:

```ts
	const [rejectedRegistrations, setRejectedRegistrations] = useState<Registration[]>([]);
```

- [ ] **Step 3: Load rejected rows through the existing class list**

In `loadQueue`, after `classData` is available, request each class registration list and filter rejected rows:

```ts
			const rejectedResults = await Promise.all(
				classData.classes.map((classRow) =>
					callManagerApi<{ registrations: Registration[] }>(client, "manage-registrations", {
						action: "list_class",
						class_id: classRow.id,
					}),
				),
			);
			setRejectedRegistrations(
				rejectedResults.flatMap((result) =>
					result.registrations.filter((registration) => registration.status === "rejected" && !registration.rejection_recovered_at),
				),
			);
```

Keep `setRegistrations(registrationData.registrations);` and `setClasses(classData.classes);` as today. If implementation adds a backend `list_rejected` convenience action during Chunk 01, use that narrower action instead and keep the same rendered behavior.

### Task 3: Add Recovery Actions

**Files:**

- Modify: `packages/class-management-react/src/components/manager/pending-registrations.tsx`

- [ ] **Step 1: Add the action helper**

Add this helper near `decide`:

```ts
	async function recover(registrationId: string, action: "approve_rejected" | "allow_reregister") {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "manage-registrations", { action, registration_id: registrationId });
			setMessage(labels.recoveryMessage);
			await loadQueue();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.capacityError);
		} finally {
			setLoading(false);
		}
	}
```

- [ ] **Step 2: Render the rejected recovery section**

After the pending registration list, add a second section:

```tsx
			<div className="mt-5 border-t border-border pt-4">
				<h4 className="font-display text-base font-bold uppercase">{labels.rejectedTitle}</h4>
				<div className="mt-3 grid gap-2">
					{rejectedRegistrations.length === 0 ? <p className="text-sm text-muted-foreground">{labels.rejectedEmpty}</p> : null}
					{rejectedRegistrations.map((registration) => {
						const classRow = classesById.get(registration.class_id);
						return (
							<div key={registration.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
								<div>
									<p>{classRow?.name ?? registration.class_id}</p>
									<p className="text-xs text-muted-foreground">
										{registration.user_id} · {formatDate(registration.updated_at ?? registration.created_at)}
									</p>
								</div>
								<div className="flex gap-2">
									<Button type="button" size="sm" onClick={() => recover(registration.id, "approve_rejected")} disabled={loading}>
										<Check className="size-4" />
										{labels.approveRejected}
									</Button>
									<Button type="button" variant="outline" size="sm" onClick={() => recover(registration.id, "allow_reregister")} disabled={loading}>
										<RefreshCw className="size-4" />
										{labels.allowReregister}
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
```

Use the existing `Check` and `RefreshCw` imports. Do not add a new icon dependency.

### Task 4: Document The Playground Smoke

**Files:**

- Modify: `apps/class-management-playground/README.md`

- [ ] **Step 1: Extend the manager class/schedule workflow smoke item**

Update the existing manager class/schedule workflow line to include rejected registration recovery:

```md
8. Manager class/schedule workflow: create or update a template, create a schedule, preview generation, generate classes, edit one generated class, cancel one generated class, list pending registrations, reject a pending registration where data supports it, then verify the rejected recovery controls can either approve the rejected registration or allow the user to re-register.
```

## Verification

Run from the repository root:

```bash
rtk npm run build:package
```

Expected: TypeScript package build exits 0.

Run:

```bash
rtk npm run build:playground
```

Expected: playground Vite build exits 0.

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

Manual smoke when Supabase stack is available:

- Sign in as `eden@manager.local`.
- Create or locate a pending registration.
- Reject it.
- Confirm it appears in Rejected registrations.
- Use `Allow re-register`; expected message appears and the rejected row leaves the actionable recovery list while remaining historical in backend data.
- Have the user re-register; expected fresh pending/approved row appears and no duplicate live row exists.
- Reject another pending registration and use `Approve`; expected row becomes approved unless capacity/membership rules reject it.

## Acceptance Criteria Covered

- Manager UI exposes approve rejected and allow re-register recovery actions.
- Existing pending approval/rejection behavior remains visible and unchanged.
- Manager recovery refreshes the queue after actions.
- Playground docs include the recovery smoke path.

## Risks And Rollback

- Loading rejected registrations through `list_class` can be chatty if there are many classes. This is acceptable for the current playground workflow; a later backend `list_rejected` action can optimize it if needed.
- Rollback is removing the rejected section and restoring the prior `Registration` type if no other code needs `updated_at`.

## Non-Goals

- No display-name/email join for rejected rows.
- No new user-facing rejected-state page.
- No direct table/RPC browser calls.

## Type And Name Consistency

Verify these names exactly:

- `approve_rejected`
- `allow_reregister`
- `rejectedRegistrations`
- `recover`
- `updated_at`
