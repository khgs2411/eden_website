# Chunk 08: Manager Class And Schedule Workflows

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md`
**Enables:** `10-playground-validation-and-hardening.md`, `11-eden-reintegration.md`

## Goal

Extract manager template, schedule/generation, generated class edit/cancel, and pending registration workflows into package Workflow Components and expose them in the playground.

## Source Artifacts

- Spec sections: Reusable Frontend Package Design, Standalone Mini App.
- Audit recommendation: split executor steps by template, schedule/generation, generated class edit/cancel, and pending registrations.
- Code paths: `src/components/product/manager/template-editor.tsx`, `schedule-editor.tsx`, `generated-class-list.tsx`, `pending-registrations.tsx`, `src/components/product/product-shell.tsx`.

## Relationships

- **Depends on:** user workflow package and shared manager API types.
- **Enables:** class/schedule manager validation.
- **Shared contracts:** `templates`, `schedules`, `schedule-generate`, `classes`, `manage-registrations` Edge Functions.
- **Integration points:** package UI adapter and Headless Core.

## File Responsibility Map

**Create:**
- `packages/class-management-react/src/components/manager/template-editor.tsx`
- `packages/class-management-react/src/components/manager/schedule-editor.tsx`
- `packages/class-management-react/src/components/manager/generated-class-list.tsx`
- `packages/class-management-react/src/components/manager/pending-registrations.tsx`
- `packages/class-management-react/src/components/manager/manager-class-dashboard.tsx`

**Modify:**
- `packages/class-management-react/src/index.ts` - export manager class/schedule components.
- `apps/class-management-playground/src/App.tsx` - include manager dashboard under current provider.

**Test:**
- Package build.
- Playground build.
- Manager Edge Function smoke in playground validation chunk.

## Implementation Tasks

### Task 1: Extract template workflow

- [ ] Copy `src/components/product/manager/template-editor.tsx` to `packages/class-management-react/src/components/manager/template-editor.tsx`.
- [ ] Replace imports:
  - `@/components/ui/button`, `input`, `label`, `textarea` -> `useClassManagementUi()`
  - `@/components/product/manager/manager-api` -> `../../manager/manager-api`
  - `react-i18next` labels -> local default labels or optional `labels` prop
- [ ] Ensure all API calls use `callManagerApi(client, "templates", ...)` with client from product context or component prop.

### Task 2: Extract schedule and generation workflow

- [ ] Copy `src/components/product/manager/schedule-editor.tsx` to package manager components.
- [ ] Preserve action names exactly:
  - `list`
  - `create`
  - `update`
  - `preview`
  - `pause`
  - `archive`
- [ ] Preserve `schedule-generate` as the Edge Function name used for generation; it is not a `schedules` action value.
- [ ] Replace UI/i18n imports with UI adapter and default labels.
- [ ] Keep default values currently used by the implementation: recurrence `weekly`, timezone `Asia/Jerusalem`, default start time and duration from current component.

### Task 3: Extract generated class edit/cancel workflow

- [ ] Copy `src/components/product/manager/generated-class-list.tsx` to package manager components.
- [ ] Preserve generated source fields in displayed/edited type shape:
  - `template_id`
  - `schedule_id`
  - `generated_for_date`
  - `source_timezone`
- [ ] Preserve class update and cancel action names:
  - `classes` action `list_manager`
  - `classes` action `update`
  - `classes` action `cancel`

### Task 4: Extract pending registrations workflow

- [ ] Copy `src/components/product/manager/pending-registrations.tsx` to package manager components.
- [ ] Preserve calls:
  - `manage-registrations` action `list_pending`
  - `manage-registrations` action `approve`
  - `manage-registrations` action `reject`
  - `classes` action `list_manager`

### Task 5: Add manager class dashboard

- [ ] Create `packages/class-management-react/src/components/manager/manager-class-dashboard.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { callManagerApi, type ClassTemplate, type Schedule } from "../../manager/manager-api";
import { useClassManagementClient } from "../../context/product-context-state";
import { TemplateEditor } from "./template-editor";
import { ScheduleEditor } from "./schedule-editor";
import { GeneratedClassList } from "./generated-class-list";
import { PendingRegistrations } from "./pending-registrations";

export function ManagerClassDashboard() {
  const client = useClassManagementClient();
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const refreshSharedData = useCallback(async () => {
    try {
      const [templateData, scheduleData] = await Promise.all([
        callManagerApi<{ templates: ClassTemplate[] }>(client, "templates", { action: "list" }),
        callManagerApi<{ schedules: Schedule[] }>(client, "schedules", { action: "list" })
      ]);
      setTemplates(templateData.templates);
      setSchedules(scheduleData.schedules);
      setRefreshKey((value) => value + 1);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load manager data.");
    }
  }, [client]);

  useEffect(() => {
    void refreshSharedData();
  }, [refreshSharedData]);

  return (
    <section className="grid gap-5">
      {message ? <p>{message}</p> : null}
      <TemplateEditor onChanged={refreshSharedData} />
      <ScheduleEditor templates={templates} onChanged={refreshSharedData} />
      <GeneratedClassList templates={templates} schedules={schedules} refreshKey={refreshKey} />
      <PendingRegistrations refreshKey={refreshKey} />
    </section>
  );
}
```

`useClassManagementClient()` is provided by `05-headless-core-extraction.md`; this chunk should consume it as an established package contract.

### Task 6: Wire playground manager class dashboard

- [ ] Add `ManagerClassDashboard` to `apps/class-management-playground/src/App.tsx` below `UserDashboard`.
- [ ] Show the dashboard only when `productUser?.role === "manager"` and `productUser.status === "active"`.

### Task 7: Verify

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

Package/playground build and lint pass. Playground displays manager class dashboard for manager session after login.

## Acceptance Criteria Covered

- Manager class/schedule workflows become package Workflow Components.
- Playground exercises manager class/schedule surface.

## Risks And Rollback

- This chunk is broad but split internally by workflow to preserve reviewability.
- Roll back by removing package manager class components and playground dashboard import.

## Non-Goals

- Membership and attendance manager workflows.
- Eden reintegration.
- Changing manager API actions.

## Type And Name Consistency

Use `TemplateEditor`, `ScheduleEditor`, `GeneratedClassList`, `PendingRegistrations`, and `ManagerClassDashboard`.
