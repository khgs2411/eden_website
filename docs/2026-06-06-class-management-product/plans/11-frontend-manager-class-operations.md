# Chunk 11: Frontend Manager Class Operations

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `09-frontend-product-auth-shell.md`, `03-template-class-core.md`, `05-schedule-generation-engine.md`, `07-registration-engine.md`
**Enables:** manager schedule/class workflow validation

## Goal

Build manager UI for class operations: template editor, schedule editor/preview/activation, generated class inspection, direct class edits/cancellation, explicit schedule-cancellation choices, and pending registration approval queue.

## Source Artifacts

- Root spec: manager class/template permissions, class statuses.
- Schedule spec: schedule read-only template placement, rolling generation, skip/cancel model.
- Context: Manager, Class Template, Schedule, Class, Class Override.

## Relationships

- **Depends on:** product shell and backend template/class/schedule/registration APIs.
- **Enables:** manager class/schedule validation.
- **Shared contracts:** template field editor model, schedule preview model, generated class list model.
- **Integration points:** Edge Functions `templates`, `schedules`, `schedule-generate`, `classes`, `manage-registrations`.

## View Model Contract

Manager schedule preview consumes:

```ts
type SchedulePreviewOccurrence = {
  date: string;
  local_start: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  skipped: boolean;
};
```

Schedule generation consumes:

```ts
type ScheduleGenerationResult = {
  created_count: number;
  existing_count: number;
  skipped_count: number;
};
```

## File Responsibility Map

**Create:**
- `src/components/product/manager/template-editor.tsx`
- `src/components/product/manager/schedule-editor.tsx`
- `src/components/product/manager/generated-class-list.tsx`
- `src/components/product/manager/pending-registrations.tsx`

**Modify:**
- `src/components/product/product-shell.tsx` - mount manager class operations when role is manager.
- `src/i18n.ts` - manager class/schedule copy.

**Test:**
- `npm run lint`, `npm run build`.

## Implementation Tasks

### Task 1: Template editor

- [ ] List/create/update/deactivate class templates.
- [ ] Support allowed custom field types only.
- [ ] Make clear that templates own defaults; schedules do not override class defaults.

### Task 2: Schedule editor and preview

- [ ] Create/update draft schedules from a selected template.
- [ ] Preview one-time and weekly recurrence.
- [ ] Activate/pause/archive schedules.
- [ ] Trigger generation and display created/existing/skipped counts.

### Task 3: Generated class operations

- [ ] List generated classes with source template/schedule.
- [ ] Edit individual class fields directly, creating a Class Override conceptually.
- [ ] Cancel individual classes.
- [ ] When archiving/cancelling a schedule with future classes, present explicit choices: leave generated classes or cancel selected classes.

### Task 4: Pending registration queue

- [ ] List pending registrations by class.
- [ ] Approve/reject pending registrations through manager API.
- [ ] Reflect capacity errors from backend.

## Verification

- Run: `npm run lint`
- Run: `npm run build`
- Manual smoke:
  - Manager creates template.
  - Manager creates/activates weekly schedule.
  - Generation creates future classes.
  - Manager edits one generated class without mutating schedule/template.
  - Manager approves/rejects pending registration.

## Acceptance Criteria Covered

- Managers create templates and schedules.
- Managers inspect and manage generated concrete classes.
- Schedule cancellation UI makes existing generated class handling explicit.
- Managers approve/reject pending registrations.

## Risks And Rollback

- Large UI surface; keep this chunk manager class operations only.
- Rollback by unmounting manager class operations from product shell.

## Non-Goals

- Membership type/grant UI.
- Attendance start/completion UI.
- User registration UI.

## Type And Name Consistency

Use Manager, Class Template, Schedule, Class, and Class Override exactly as glossary terms.
