# Chunk 02: Manager Membership Type Edit UI

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-backend-update-type-preservation.md`
**Enables:** End-to-end manager membership type editing

## Goal

Add an inline edit workflow to the manager Membership Types component so managers can update created membership type names and mode-appropriate defaults without changing existing grants.

## Source Artifacts

- Spec: Frontend Contract, User-Facing Behavior, Error Handling, Acceptance Criteria.
- Agenda: Questions 1, 2, 4, and 5.
- Context: Membership Type, Membership Grant.
- Existing frontend:
  - `packages/class-management-react/src/components/manager/membership-types.tsx`
  - `packages/class-management-react/src/components/manager/manager-operations-dashboard.tsx`
  - `packages/class-management-react/src/components/manager/membership-grants.tsx`
  - `packages/class-management-react/src/manager/manager-api.ts`
  - `apps/class-management-playground/src/App.tsx`
- Root scripts: `package.json`

## Relationships

- **Depends on:** Chunk 01 backend validation for `update_type`.
- **Enables:** Managers can maintain membership products after initial creation.
- **Shared contracts:** `MembershipType`, `MembershipMode`, `memberships` action `update_type`, and the backend rule that unsupported non-null default fields are rejected.
- **Integration points:** Existing `ManagerOperationsDashboard` refresh callback and playground Memberships page.

## File Responsibility Map

**Create:**
- No new files.

**Modify:**
- `packages/class-management-react/src/components/manager/membership-types.tsx` - add edit state, edit controls, update API call, and future-only helper copy.

**Test:**
- Package and playground builds.
- Manual playground smoke on the Memberships page.

## Implementation Tasks

### Task 1: Add edit state and labels

**Files:**
- Modify: `packages/class-management-react/src/components/manager/membership-types.tsx`

- [ ] Extend the icon import and labels:

```ts
import { Pencil, RefreshCw, ShieldMinus, X } from "lucide-react";
```

```ts
const labels = {
	// keep existing labels
	edit: "Edit",
	cancel: "Cancel",
	save: "Save",
	futureOnly: "Edits apply to future grants only. Existing grants keep their issued stock and validity.",
};
```

- [ ] Add edit state next to the current create-form state:

```ts
const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
const [editName, setEditName] = useState("");
const [editDefaultStock, setEditDefaultStock] = useState("");
const [editDefaultDurationDays, setEditDefaultDurationDays] = useState("");
```

- [ ] Add helper functions:

```ts
function startEdit(type: MembershipType) {
	setEditingTypeId(type.id);
	setEditName(type.name);
	setEditDefaultStock(type.default_stock?.toString() ?? "");
	setEditDefaultDurationDays(type.default_duration_days?.toString() ?? "");
	setMessage(null);
}

function cancelEdit() {
	setEditingTypeId(null);
	setEditName("");
	setEditDefaultStock("");
	setEditDefaultDurationDays("");
}
```

### Task 2: Wire `update_type`

**Files:**
- Modify: `packages/class-management-react/src/components/manager/membership-types.tsx`

- [ ] Add an update handler:

```ts
async function updateType(type: MembershipType) {
	setLoading(true);
	setMessage(null);
	try {
		const payload: {
			action: "update_type";
			membership_type_id: string;
			name: string;
			default_stock?: number | null;
			default_duration_days?: number | null;
		} = {
			action: "update_type",
			membership_type_id: type.id,
			name: editName.trim(),
		};

		if (usesStock(type.mode)) {
			payload.default_stock = editDefaultStock ? Number(editDefaultStock) : null;
		}

		if (usesDuration(type.mode)) {
			payload.default_duration_days = editDefaultDurationDays ? Number(editDefaultDurationDays) : null;
		}

		await callManagerApi(client, "memberships", payload);
		cancelEdit();
		await loadTypes();
		onChanged();
		setMessage(labels.saved);
	} catch (error) {
		setMessage(error instanceof Error ? error.message : labels.error);
	} finally {
		setLoading(false);
	}
}
```

- [ ] Do not include `mode`, `default_stock` for `limited`/`infinite` types, or `default_duration_days` for `stock`/`infinite` types in the update payload.
- [ ] Keep `createType` and `deactivateType` behavior unchanged.

### Task 3: Render inline edit controls

**Files:**
- Modify: `packages/class-management-react/src/components/manager/membership-types.tsx`

- [ ] In the `types.map` block, render either display mode or edit mode. The edit mode should preserve stable row layout and disable invalid fields by immutable mode:

```tsx
{types.map((type) => {
	const isEditing = editingTypeId === type.id;
	return (
		<div key={type.id} className="grid gap-3 rounded-md border border-border px-3 py-2 text-sm md:grid-cols-[1fr_auto]">
			{isEditing ? (
				<div className="grid gap-3 md:grid-cols-3">
					<TextField label={labels.name} value={editName} onChange={setEditName} />
					<TextField label={labels.defaultStock} type="number" value={editDefaultStock} onChange={setEditDefaultStock} disabled={!usesStock(type.mode)} />
					<TextField label={labels.defaultDuration} type="number" value={editDefaultDurationDays} onChange={setEditDefaultDurationDays} disabled={!usesDuration(type.mode)} />
					<p className="text-xs text-muted-foreground md:col-span-3">{labels.futureOnly}</p>
				</div>
			) : (
				<div>
					<p>{type.name} · {labels.modes[type.mode]} · {type.status}</p>
					<p className="text-xs text-muted-foreground">{formatTypeLimits(type)}</p>
				</div>
			)}
			<div className="flex flex-wrap items-center gap-2 md:justify-end">
				{isEditing ? (
					<>
						<Button type="button" size="sm" onClick={() => updateType(type)} disabled={loading || editName.trim().length === 0}>{labels.save}</Button>
						<Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
							<X className="size-4" />
							{labels.cancel}
						</Button>
					</>
				) : (
					<>
						<Button type="button" variant="ghost" size="sm" onClick={() => startEdit(type)} disabled={loading || type.status === "inactive"}>
							<Pencil className="size-4" />
							{labels.edit}
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => deactivateType(type.id)} disabled={loading || type.status === "inactive"}>
							<ShieldMinus className="size-4" />
							{labels.deactivate}
						</Button>
					</>
				)}
			</div>
		</div>
	);
})}
```

- [ ] Keep text small inside rows and avoid adding a marketing-style explanatory section.
- [ ] Do not add a mode selector for edits.

## Verification

- Run: `rtk npm run build:package`
  - Expected: exits 0.
- Run: `rtk npm run build:playground`
  - Expected: exits 0.
- Run: `rtk npm run lint`
  - Expected: exits 0.
- Run: `rtk npm run build`
  - Expected: exits 0.
- Manual playground smoke when local backend is available:
  - Open Memberships page.
  - Create a disposable stock membership type with default stock 10.
  - Grant it to a test product user.
  - Edit the membership type default stock to 12.
  - Expected: existing grant still shows original grant stock values; future grant uses 12.

## Acceptance Criteria Covered

- Managers can edit existing membership type names and defaults.
- Mode remains immutable in the UI.
- Existing grant/upgrade/revoke workflows remain unchanged.
- Dependent membership views refresh after edit.

## Risks And Rollback

- Risk: Inline editing can make rows too dense on mobile. Use grid wrapping and existing compact form controls.
- Risk: A renamed type may relabel old grants because there is no historical name snapshot. Keep entitlement values visible and do not claim labels are historical.
- Risk: Sending disabled-field values would trigger Chunk 01's backend validation. Build the payload by adding only fields relevant to the immutable mode.
- Rollback: remove edit state, edit buttons, and `update_type` call from `membership-types.tsx`; backend Chunk 01 can remain because it only hardens an existing action.

## Non-Goals

- Individual grant editing.
- Historical type-name snapshots.
- New membership route/page.
- Adding i18n wiring for package-local labels.

## Type And Name Consistency

Use existing exported types and helpers: `MembershipType`, `MembershipMode`, `callManagerApi`, `usesStock`, `usesDuration`, `TextField`, and `ManagerOperationsDashboard`.
