# Chunk 08: Attendance Engine

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `07-registration-engine.md`
**Enables:** manager attendance workflow and class history

## Goal

Implement class start/completion and participation tracking: registered attendees, walk-ins, trials, attendance status, lifecycle transitions, and post-start registration blocking.

## Source Artifacts

- Root spec: attendance model, class lifecycle, class-start attendance flow.
- Root agenda: Questions 13, 22, 23, 24.
- Context: Class Participant, Attendance, Walk-in, Trial.

## Relationships

- **Depends on:** classes and registrations.
- **Enables:** attendance frontend and class history.
- **Shared contracts:** participant kind values `registered`, `walk_in`, `trial`; attendance status values `present`, `absent`.
- **Integration points:** class lifecycle, registration cutoff, manager APIs.

## File Responsibility Map

**Create:**
- `supabase/migrations/<generated>_attendance_engine.sql` - participants table/functions.
- `supabase/functions/attendance/index.ts` - manager start/update/complete class attendance API.

**Modify:**
- `supabase/functions/classes/index.ts` - include lifecycle transitions if not isolated in attendance function.

**Test:**
- SQL/RPC smoke tests for participant constraints and lifecycle transitions.

## Implementation Tasks

### Task 1: Create participant schema

- [ ] Run `supabase migration new attendance_engine`.
- [ ] Create `class_participants` with this contract:

```sql
create table public.class_participants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  participant_kind text not null check (participant_kind in ('registered', 'walk_in', 'trial')),
  user_id uuid references auth.users(id) on delete set null,
  registration_id uuid references public.class_registrations(id) on delete set null,
  trial_name text,
  trial_contact text,
  attendance_status text not null default 'absent' check (attendance_status in ('present', 'absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (participant_kind = 'registered' and user_id is not null and registration_id is not null)
    or (participant_kind = 'walk_in' and user_id is not null and registration_id is null)
    or (participant_kind = 'trial' and user_id is null and registration_id is null and trial_name is not null)
  )
);
```
- [ ] Enforce:
  - registered participants reference registration/user
  - walk-ins reference product user and no registration
  - trials do not require user_id and default present.

### Task 2: Implement start class transaction

- [ ] Manager starts class; lifecycle becomes `in_progress`.
- [ ] Approved registrations are copied into participants with default attendance status chosen by manager request or `absent` until marked.
- [ ] Registration is blocked once lifecycle is `in_progress`.

### Task 3: Implement attendance updates

- [ ] Manager marks registered participants `present` or `absent`.
- [ ] Manager adds walk-in product users.
- [ ] Manager adds trial attendees present by default.
- [ ] Manager completes class; lifecycle becomes `completed`.

## Verification

- Run: `rtk supabase status`
- Run: `supabase db reset`
- Start a class with approved registrations.
  - Expected: lifecycle `in_progress`, participants created.
- Attempt registration after start.
  - Expected: blocked.
- Add walk-in and trial.
  - Expected: constraints accept correct shapes and reject impossible shapes.
- Complete class.
  - Expected: lifecycle `completed`.
- Run invalid-shape SQL check after creating a class id:

```bash
supabase db query "insert into public.class_participants (product_id, class_id, participant_kind, attendance_status) values ('<product-id>', '<class-id>', 'trial', 'present');"
```

  - Expected: fails because `trial_name` is required for `trial`.
- Run attendance API smoke:

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","action":"start","class_id":"<class-id>"}' http://127.0.0.1:54321/functions/v1/attendance
```

  - Expected: 200 with class lifecycle `in_progress`.

```bash
curl -i -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' -d '{"product_key":"eden","action":"add_trial","class_id":"<class-id>","trial_name":"New Student","trial_contact":"new@example.com"}' http://127.0.0.1:54321/functions/v1/attendance
```

  - Expected: 200 with participant kind `trial` and attendance status `present`.

## Acceptance Criteria Covered

- Attendance split from registration.
- Walk-ins and trials supported.
- Starting class blocks registration.
- Lifecycle statuses are manual manager actions.

## Risks And Rollback

- Participant constraints can become too permissive. Test invalid states.
- Rollback by removing attendance migration/functions before frontend attendance chunk.

## Non-Goals

- Reminders.
- Trial conversion to product user.
- Attendance analytics.

## Type And Name Consistency

Use `registered`, `walk_in`, and `trial` participant kinds exactly.
