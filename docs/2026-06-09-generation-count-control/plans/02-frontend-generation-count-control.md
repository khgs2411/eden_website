# Chunk 02: Frontend Generation Count Control

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-backend-generation-count-contract.md`
**Enables:** Manager-controlled generation from the reusable package and playground UI

## Goal

Add a compact manager-facing numeric control to the reusable `ScheduleEditor` so Generate requests include `generation_count`, with local validation matching the backend range and no Eden-specific product logic.

## Source Artifacts

- Spec: User-Facing Behavior, Frontend Package, Playground / Consumer, Acceptance Criteria.
- Agenda: Questions 1, 3, and 5.
- Existing code:
  - `packages/class-management-react/src/components/manager/schedule-editor.tsx`
  - `packages/class-management-react/src/manager/manager-api.ts`
  - `apps/class-management-playground/src/App.tsx`

## Relationships

- **Depends on:** backend `schedule-generate` accepts `generation_count`.
- **Enables:** manager-controlled generation from package consumers.
- **Shared contracts:** `generation_count` integer `1..52`; default `8`; response type unchanged.
- **Integration points:** reusable package build, playground build, manager schedule workflow.

## File Responsibility Map

**Create:**
- None expected.

**Modify:**
- `packages/class-management-react/src/manager/manager-api.ts` - add request type if useful.
- `packages/class-management-react/src/components/manager/schedule-editor.tsx` - add count state, numeric input, validation, and request payload.

**Test:**
- Package TypeScript build.
- Playground build.
- ESLint.
- Manual playground smoke when local Supabase is available.

## Implementation Tasks

### Task 1: Add the generation request type

**Files:**
- Modify: `packages/class-management-react/src/manager/manager-api.ts`

- [ ] **Step 1: Add this type near `ScheduleGenerationResult`**

```ts
export type ScheduleGenerationRequest = {
	schedule_id: string | null;
	generation_count: number;
};
```

Keep `ScheduleGenerationResult` unchanged:

```ts
export type ScheduleGenerationResult = {
	created_count: number;
	existing_count: number;
	skipped_count: number;
};
```

### Task 2: Add count state and validation to ScheduleEditor

**Files:**
- Modify: `packages/class-management-react/src/components/manager/schedule-editor.tsx`

- [ ] **Step 1: Import the request type**

```ts
import { callManagerApi, type ClassTemplate, type Schedule, type ScheduleGenerationRequest, type ScheduleGenerationResult, type SchedulePreviewOccurrence } from "../../manager/manager-api";
```

- [ ] **Step 2: Add labels**

Add to the existing `labels` object:

```ts
	generateCount: "Generate count",
	invalidGenerateCount: "Generate count must be between 1 and 52.",
```

- [ ] **Step 3: Add state**

Add near the existing component state:

```ts
const [generationCount, setGenerationCount] = useState("8");
```

- [ ] **Step 4: Add a parser inside `ScheduleEditor` before `generate`**

```ts
function parsedGenerationCount() {
	const parsed = Number(generationCount);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
		return null;
	}

	return parsed;
}
```

### Task 3: Send generation_count on Generate

**Files:**
- Modify: `packages/class-management-react/src/components/manager/schedule-editor.tsx`

- [ ] **Step 1: Validate before the API call**

Inside `generate(scheduleId?: string)`, after the active-schedule check and before `setLoading(true)`, add:

```ts
const count = parsedGenerationCount();
if (count === null) {
	setGeneration(null);
	setMessage(labels.invalidGenerateCount);
	return;
}
```

- [ ] **Step 2: Send the typed request**

Replace the current call:

```ts
const data = await callManagerApi<ScheduleGenerationResult>(client, "schedule-generate", { schedule_id: scheduleId ?? null });
```

with:

```ts
const request: ScheduleGenerationRequest = {
	schedule_id: scheduleId ?? null,
	generation_count: count,
};
const data = await callManagerApi<ScheduleGenerationResult>(client, "schedule-generate", request);
```

If `callManagerApi`'s body type rejects the typed request because it lacks an index signature, widen only the helper signature to accept object records safely:

```ts
export async function callManagerApi<T>(client: ClassManagementClient | null, functionName: string, body: object) {
	const response = await invokeProductFunction<T>(client, functionName, body as Record<string, unknown>);
	if (response.error) {
		throw new Error(response.error.message);
	}
	return response.data;
}
```

Do not introduce a larger API client abstraction for this task.

### Task 4: Render the numeric input

**Files:**
- Modify: `packages/class-management-react/src/components/manager/schedule-editor.tsx`

- [ ] **Step 1: Add the input near the schedule form fields**

Place this after the timezone field or immediately before the Generate buttons so the control is visible before action:

```tsx
<TextField label={labels.generateCount} type="number" value={generationCount} onChange={setGenerationCount} />
```

- [ ] **Step 2: Disable Generate buttons when the count is invalid**

Create a local boolean near render:

```ts
const canGenerateCount = parsedGenerationCount() !== null;
```

Use it in both Generate button `disabled` expressions:

```tsx
disabled={loading || !form.id || !canGenerateCount || schedules.find((schedule) => schedule.id === form.id)?.status !== "active"}
```

and:

```tsx
disabled={schedule.status !== "active" || !canGenerateCount}
```

Do not disable create/update/preview actions because the count only affects generation.

## Verification

- Run from repo root: `rtk npm run build:package`
  - Expected: package TypeScript build passes.
- Run from repo root: `rtk npm run build:playground`
  - Expected: playground build passes and imports the updated package.
- Run from repo root: `rtk npm run lint`
  - Expected: ESLint passes.
- Manual smoke when local Supabase is available:
  - Start backend functions and playground.
  - Sign in as a manager.
  - Open Schedules.
  - Set Generate count to `3`.
  - Generate an active schedule.
  - Expected: result message reports no more than three processed generated/existing/skipped candidate occurrences for that schedule.
  - Set Generate count to `0`.
  - Expected: Generate is disabled or local validation message appears; no Edge Function request should be required.

## Acceptance Criteria Covered

- Managers can choose a generate count from the schedule UI.
- UI sends `generation_count` to `schedule-generate`.
- Default UI value is `8`.
- Invalid UI values are blocked locally.
- The reusable package owns the behavior, so playground and future consumer websites receive it.

## Risks And Rollback

- Risk: Calling `parsedGenerationCount()` during render is cheap here; if future validation grows, convert it to a memoized value.
- Risk: The schedule editor is dense. Keep the input small and aligned with existing form fields instead of adding a new panel.
- Rollback: remove the count state/input and restore the previous payload `{ schedule_id: scheduleId ?? null }`.

## Non-Goals

- No product settings page.
- No all-schedules UI button.
- No new dashboard layout.
- No translations beyond the existing package-local English labels.

## Type And Name Consistency

Use `generationCount` for component state and `generation_count` in the request object. Keep the visible label `Generate count`.
