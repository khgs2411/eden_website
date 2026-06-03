# Lesson Management Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Supabase Auth, student lesson booking, admin lesson management, and owner-managed admin roles inside the existing Eden website.

**Architecture:** Keep the marketing site intact and add a small authenticated app surface using hash routing for GitHub Pages compatibility. Supabase remains the backend boundary: RLS protects table reads, direct client access is read-only for app data, and RPCs handle every feature write that needs authorization, audit fields, or atomic business rules.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS, `@supabase/supabase-js`, Supabase Postgres/Auth/RLS.

---

## Scope Notes

The approved spec is `docs/superpowers/specs/2026-05-31-lesson-management-service-design.md`.

The user explicitly said no dedicated tests are required. This plan therefore does not add a test runner. Each task still includes a light verification step using `npm run lint` or `npm run build` where useful, plus manual checks for the UI paths.

Before implementation, follow `docs/deployment/development-guideline.md`: create an isolated feature branch/worktree, implement there, merge back to `master` with `--no-ff`, push, then remove the worktree and branch.

## File Structure

Create:

- The timestamped `supabase/migrations/*_lesson_management_service.sql` file created by `supabase migration new` - schema, helper functions, RPCs, grants, and RLS policies.
- `src/features/lesson-management/types.ts` - TypeScript types shared by feature components.
- `src/features/lesson-management/auth-context.tsx` - Supabase session/profile/admin state and auth actions.
- `src/features/lesson-management/hash-router.ts` - minimal hash-route utilities.
- `src/features/lesson-management/lesson-service.ts` - Supabase reads and RPC wrappers.
- `src/features/lesson-management/auth-pages.tsx` - login/register/profile completion screens.
- `src/features/lesson-management/student-pages.tsx` - lesson browser and my bookings pages.
- `src/features/lesson-management/admin-pages.tsx` - admin dashboard, calendar agenda, lesson form, approvals.
- `src/features/lesson-management/admin-users-page.tsx` - owner-only admin management page.
- `src/features/lesson-management/lesson-management-app.tsx` - authenticated app composition and route guards.
- `docs/deployment/lesson-management-bootstrap.md` - first-owner and OAuth redirect deployment handoff.

Modify:

- `src/App.tsx` - mount the feature app when the hash route belongs to lesson management.
- `src/components/layout/site-header.tsx` - add account/lessons/admin navigation links without disrupting existing marketing anchors.
- `src/i18n.ts` - add Hebrew, English, and Russian copy for auth, bookings, admin, and errors.
- `.env.example` - document `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the feature.

Do not modify:

- `public/assets/*`
- Existing static marketing lesson data unless wiring a CTA to `#/lessons`.
- Existing `public.lesson_signups` migration/table.

## Task 0: Prepare Isolated Work

**Files:**
- Read: `docs/deployment/development-guideline.md`
- No app files changed

- [ ] **Step 1: Read deployment workflow**

Run:

```bash
rtk read docs/deployment/development-guideline.md
```

Expected: the workflow describes feature branch, isolated worktree, no-ff merge into `master`, push, cleanup.

- [ ] **Step 2: Check current branch and worktree**

Run:

```bash
rtk git status --short
rtk git branch --show-current
```

Expected: understand existing local changes before creating the feature worktree. Do not overwrite unrelated changes.

- [ ] **Step 3: Create the implementation branch/worktree**

Use the repo workflow from the guideline. If the project already has a preferred command, follow it. Otherwise use native git:

```bash
rtk git worktree add ../eden_website-lesson-management -b feat/lesson-management-service master
```

Expected: a clean isolated checkout at `../eden_website-lesson-management`.

## Task 1: Add Supabase Schema, RPCs, Grants, and RLS

**Files:**
- Create: timestamped `supabase/migrations/*_lesson_management_service.sql`

- [ ] **Step 1: Generate migration file**

Run from the implementation worktree:

```bash
rtk supabase migration new lesson_management_service
```

Expected: Supabase creates a timestamped SQL file under `supabase/migrations/`.

- [ ] **Step 2: Add tables and helper functions**

Write the migration with these units in order:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.lessons (
  id bigint generated by default as identity primary key,
  title text not null,
  style text not null,
  description text,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.lesson_registrations (
  id bigint generated by default as identity primary key,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes:

```sql
create unique index if not exists lesson_registrations_one_active_per_student
  on public.lesson_registrations (lesson_id, student_id)
  where status in ('pending', 'approved');

create index if not exists lesson_registrations_lesson_status_idx
  on public.lesson_registrations (lesson_id, status);

create index if not exists lesson_registrations_student_requested_idx
  on public.lesson_registrations (student_id, requested_at desc);

create index if not exists lessons_starts_status_idx
  on public.lessons (starts_at, status);
```

- [ ] **Step 3: Add profile trigger and role helpers**

Add:

```sql
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

create trigger lesson_registrations_touch_updated_at
  before update on public.lesson_registrations
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.active = true
      and au.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = 'owner'
  );
$$;
```

- [ ] **Step 4: Add booking/admin RPCs**

Add RPCs matching the spec. Start with profile and lesson writes:

```sql
create or replace function public.update_my_profile(p_full_name text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_full_name text := nullif(trim(p_full_name), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;

  if v_full_name is null or v_phone is null then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_REQUIRED');
  end if;

  insert into public.profiles (id, full_name, phone)
  values (v_uid, v_full_name, v_phone)
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        updated_at = now();

  return jsonb_build_object('ok', true, 'profileId', v_uid);
end;
$$;

create or replace function public.save_lesson(
  p_lesson_id bigint,
  p_title text,
  p_style text,
  p_description text,
  p_location text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.lessons%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  if nullif(trim(p_title), '') is null
    or nullif(trim(p_style), '') is null
    or nullif(trim(p_location), '') is null
    or p_starts_at is null
    or p_ends_at is null
    or p_ends_at <= p_starts_at
    or p_capacity is null
    or p_capacity <= 0
    or p_status not in ('draft', 'published', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_LESSON');
  end if;

  if p_lesson_id is null then
    insert into public.lessons (
      title, style, description, location, starts_at, ends_at, capacity, status, created_by, updated_by
    ) values (
      trim(p_title), trim(p_style), nullif(trim(p_description), ''), trim(p_location), p_starts_at, p_ends_at, p_capacity, p_status, v_uid, v_uid
    )
    returning * into v_lesson;
  else
    update public.lessons
    set title = trim(p_title),
        style = trim(p_style),
        description = nullif(trim(p_description), ''),
        location = trim(p_location),
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        capacity = p_capacity,
        status = p_status,
        updated_by = v_uid,
        updated_at = now()
    where id = p_lesson_id
    returning * into v_lesson;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'LESSON_NOT_FOUND');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'lessonId', v_lesson.id, 'status', v_lesson.status);
end;
$$;

create or replace function public.cancel_lesson(p_lesson_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  update public.lessons
  set status = 'cancelled',
      updated_by = v_uid,
      updated_at = now()
  where id = p_lesson_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'LESSON_NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'lessonId', p_lesson_id, 'status', 'cancelled');
end;
$$;

create or replace function public.list_lesson_availability(p_lesson_ids bigint[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'lessonId', l.id,
      'approvedCount', (
        select count(*)::integer
        from public.lesson_registrations r
        where r.lesson_id = l.id
          and r.status = 'approved'
      )
    )
    order by l.id
  ), '[]'::jsonb)
  into v_payload
  from public.lessons l
  where l.id = any(p_lesson_ids)
    and (
      public.is_admin()
      or (l.status = 'published' and l.starts_at > now())
      or exists (
        select 1
        from public.lesson_registrations r
        where r.lesson_id = l.id
          and r.student_id = v_uid
      )
    );

  return jsonb_build_object('ok', true, 'availability', v_payload);
end;
$$;
```

Then add registration/admin RPCs:

```sql
create or replace function public.request_lesson_registration(p_lesson_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.lessons%rowtype;
  v_registration public.lesson_registrations%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid
      and nullif(trim(p.full_name), '') is not null
      and nullif(trim(p.phone), '') is not null
  ) then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_REQUIRED');
  end if;

  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
    and status = 'published'
    and starts_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'LESSON_UNAVAILABLE');
  end if;

  insert into public.lesson_registrations (lesson_id, student_id, status, requested_at)
  values (p_lesson_id, v_uid, 'pending', now())
  returning * into v_registration;

  return jsonb_build_object('ok', true, 'registrationId', v_registration.id, 'status', v_registration.status);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_REGISTERED');
end;
$$;

create or replace function public.cancel_lesson_registration(p_registration_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_registration public.lesson_registrations%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;

  select r.* into v_registration
  from public.lesson_registrations r
  join public.lessons l on l.id = r.lesson_id
  where r.id = p_registration_id
    and r.student_id = v_uid
    and r.status in ('pending', 'approved')
    and l.starts_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'REGISTRATION_CLOSED');
  end if;

  update public.lesson_registrations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_registration_id;

  return jsonb_build_object('ok', true, 'registrationId', p_registration_id, 'status', 'cancelled');
end;
$$;
```

For `approve_lesson_registration`, lock the lesson row before counting approved registrations:

```sql
create or replace function public.approve_lesson_registration(p_registration_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_registration public.lesson_registrations%rowtype;
  v_lesson public.lessons%rowtype;
  v_approved_count integer;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  select * into v_registration
  from public.lesson_registrations
  where id = p_registration_id and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'REGISTRATION_NOT_FOUND');
  end if;

  select * into v_lesson
  from public.lessons
  where id = v_registration.lesson_id and status = 'published'
  for update;

  if not found or v_lesson.starts_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'LESSON_UNAVAILABLE');
  end if;

  select count(*)::integer into v_approved_count
  from public.lesson_registrations
  where lesson_id = v_lesson.id and status = 'approved';

  if v_approved_count >= v_lesson.capacity then
    return jsonb_build_object('ok', false, 'error', 'CAPACITY_FULL');
  end if;

  update public.lesson_registrations
  set status = 'approved', decided_by = v_uid, decided_at = now(), updated_at = now()
  where id = p_registration_id;

  return jsonb_build_object('ok', true, 'registrationId', p_registration_id, 'status', 'approved');
end;
$$;
```

Add the remaining state-transition RPCs:

```sql
create or replace function public.reject_lesson_registration(p_registration_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  end if;

  update public.lesson_registrations
  set status = 'rejected', decided_by = v_uid, decided_at = now(), updated_at = now()
  where id = p_registration_id
    and status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'REGISTRATION_NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'registrationId', p_registration_id, 'status', 'rejected');
end;
$$;

create or replace function public.upsert_admin_user(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_owner() then
    return jsonb_build_object('ok', false, 'error', 'OWNER_REQUIRED');
  end if;

  if p_role not in ('owner', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_ROLE');
  end if;

  insert into public.admin_users (user_id, role, active, created_by)
  values (p_user_id, p_role, true, v_uid)
  on conflict (user_id) do update
    set role = excluded.role,
        active = true;

  return jsonb_build_object('ok', true, 'userId', p_user_id, 'role', p_role);
end;
$$;

create or replace function public.deactivate_admin_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_owner_count integer;
begin
  if not public.is_owner() then
    return jsonb_build_object('ok', false, 'error', 'OWNER_REQUIRED');
  end if;

  perform pg_advisory_xact_lock(hashtext('lesson_management_admin_owner_lock'));

  select count(*)::integer into v_active_owner_count
  from public.admin_users
  where active = true
    and role = 'owner';

  if exists (
    select 1
    from public.admin_users
    where user_id = p_user_id
      and active = true
      and role = 'owner'
  ) and v_active_owner_count <= 1 then
    return jsonb_build_object('ok', false, 'error', 'LAST_OWNER');
  end if;

  update public.admin_users
  set active = false
  where user_id = p_user_id
    and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ADMIN_NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'userId', p_user_id, 'active', false);
end;
$$;
```

- [ ] **Step 5: Add RLS and grants**

Enable RLS and grants:

```sql
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_registrations enable row level security;

grant select on public.lessons to authenticated;
grant select on public.profiles to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.lesson_registrations to authenticated;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_owner() from public, anon;
revoke execute on function public.update_my_profile(text, text) from public, anon;
revoke execute on function public.save_lesson(bigint, text, text, text, text, timestamptz, timestamptz, integer, text) from public, anon;
revoke execute on function public.cancel_lesson(bigint) from public, anon;
revoke execute on function public.list_lesson_availability(bigint[]) from public, anon;
revoke execute on function public.request_lesson_registration(bigint) from public, anon;
revoke execute on function public.cancel_lesson_registration(bigint) from public, anon;
revoke execute on function public.approve_lesson_registration(bigint) from public, anon;
revoke execute on function public.reject_lesson_registration(bigint) from public, anon;
revoke execute on function public.upsert_admin_user(uuid, text) from public, anon;
revoke execute on function public.deactivate_admin_user(uuid) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.save_lesson(bigint, text, text, text, text, timestamptz, timestamptz, integer, text) to authenticated;
grant execute on function public.cancel_lesson(bigint) to authenticated;
grant execute on function public.list_lesson_availability(bigint[]) to authenticated;
grant execute on function public.request_lesson_registration(bigint) to authenticated;
grant execute on function public.cancel_lesson_registration(bigint) to authenticated;
grant execute on function public.approve_lesson_registration(bigint) to authenticated;
grant execute on function public.reject_lesson_registration(bigint) to authenticated;
grant execute on function public.upsert_admin_user(uuid, text) to authenticated;
grant execute on function public.deactivate_admin_user(uuid) to authenticated;
```

Policies:

```sql
create policy profiles_self_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create policy admin_users_admin_select on public.admin_users
  for select to authenticated
  using (public.is_admin());

create policy lessons_authenticated_published_select on public.lessons
  for select to authenticated
  using (status = 'published' and starts_at > now());

create policy lessons_registered_student_select on public.lessons
  for select to authenticated
  using (
    exists (
      select 1
      from public.lesson_registrations r
      where r.lesson_id = lessons.id
        and r.student_id = (select auth.uid())
    )
  );

create policy lessons_admin_select on public.lessons
  for select to authenticated
  using (public.is_admin());

create policy registrations_self_select on public.lesson_registrations
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());
```

- [ ] **Step 6: Verify local migration when Supabase is available**

Run:

```bash
rtk supabase db reset
```

Expected: local database resets and applies all migrations successfully. If local Supabase or Docker is unavailable, record the exact failure in the task handoff and continue only if the SQL has been manually reviewed.

Then confirm the existing lead-capture table still exists:

```bash
rtk supabase db query --local "select to_regclass('public.lesson_signups') as table_name;"
```

Expected: result includes `public.lesson_signups`. If `supabase db query` is unavailable in the installed CLI, use local Studio or `psql` and record the fallback.

- [ ] **Step 7: Commit schema**

Run:

```bash
rtk git add supabase/migrations/*_lesson_management_service.sql
rtk git commit -m "feat: add lesson management schema"
```

Expected: one focused schema commit.

## Task 2: Add Shared Feature Types and Supabase Service Layer

**Files:**
- Create: `src/features/lesson-management/types.ts`
- Create: `src/features/lesson-management/lesson-service.ts`

- [ ] **Step 1: Create shared types**

In `types.ts`, define:

```ts
export type AdminRole = "owner" | "admin";
export type LessonStatus = "draft" | "published" | "cancelled";
export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Profile = {
	id: string;
	full_name: string | null;
	phone: string | null;
};

export type Lesson = {
	id: number;
	title: string;
	style: string;
	description: string | null;
	location: string;
	starts_at: string;
	ends_at: string;
	capacity: number;
	status: LessonStatus;
};

export type LessonRegistration = {
	id: number;
	lesson_id: number;
	student_id: string;
	status: RegistrationStatus;
	requested_at: string;
	decided_by: string | null;
	decided_at: string | null;
	cancelled_at: string | null;
	profiles?: Profile | null;
	lessons?: Lesson | null;
};

export type LessonWithRegistration = Lesson & {
	approvedCount: number;
	registration: LessonRegistration | null;
};

export type RpcResult = {
	ok: boolean;
	error?: string;
	registrationId?: number;
	status?: RegistrationStatus;
};
```

- [ ] **Step 2: Create service wrappers**

In `lesson-service.ts`, export functions:

- `listPublishedLessons(userId: string)`
- `listMyRegistrations(userId: string)`
- `listAdminLessons(fromIso: string, toIso: string)`
- `listPendingRegistrations()`
- `listLessonAvailability(lessonIds: number[])`
- `updateMyProfile(fullName: string, phone: string)`
- `requestLessonRegistration(lessonId: number)`
- `cancelLessonRegistration(registrationId: number)`
- `approveLessonRegistration(registrationId: number)`
- `rejectLessonRegistration(registrationId: number)`
- `saveLesson(input)`
- `cancelLesson(lessonId: number)`
- `listProfiles()`
- `upsertAdminUser(userId: string, role: AdminRole)`
- `deactivateAdminUser(userId: string)`

`updateMyProfile`, `saveLesson`, `cancelLesson`, registration actions, and admin-user actions must call RPCs. Client code must not directly insert or update `profiles`, `lessons`, `lesson_registrations`, or `admin_users`.

`listLessonAvailability` must parse the RPC JSON result shape, throw a localized `AUTH_REQUIRED` error when returned, and return an empty availability map only when called with no lesson ids.

Treat `list_lesson_availability` as a read-only exception to the RPC write-boundary rule. Do not use it as a precedent for moving ordinary row reads or future write behavior into broad read RPCs.

Each function must throw a plain `Error` when `supabase` is null so the UI displays the env-config message instead of failing silently.

- [ ] **Step 3: Implement concrete read query contracts**

Use these exact read contracts so UI code does not invent data shaping:

`listPublishedLessons(userId)`:

1. Select lessons:

```ts
const { data: lessons } = await client
	.from("lessons")
	.select("id,title,style,description,location,starts_at,ends_at,capacity,status")
	.eq("status", "published")
	.gt("starts_at", new Date().toISOString())
	.order("starts_at", { ascending: true });
```

2. For returned lesson ids, load safe approved counts through RPC:

```ts
const { data: availability } = await client.rpc("list_lesson_availability", {
	p_lesson_ids: lessonIds,
});
```

3. Select only the caller's registrations for returned lesson ids:

```ts
const { data: registrations } = await client
	.from("lesson_registrations")
	.select("id,lesson_id,student_id,status,requested_at,decided_by,decided_at,cancelled_at")
	.in("lesson_id", lessonIds)
	.eq("student_id", userId);
```

4. Shape each `LessonWithRegistration` with:

- `approvedCount`: lookup from `availability.availability[]` by `lessonId`.
- `registration`: the caller's newest registration for that lesson, sorted by `requested_at` descending, or `null`.

`listMyRegistrations(userId)`:

1. Select the caller's registrations ordered newest first:

```ts
const { data: registrations } = await client
	.from("lesson_registrations")
	.select("id,lesson_id,student_id,status,requested_at,decided_by,decided_at,cancelled_at")
	.eq("student_id", userId)
	.order("requested_at", { ascending: false });
```

2. Select linked lessons by registration lesson ids:

```ts
const { data: lessons } = await client
	.from("lessons")
	.select("id,title,style,description,location,starts_at,ends_at,capacity,status")
	.in("id", lessonIds);
```

3. Attach `lessons` to each returned registration by `lesson_id`.

`listAdminLessons(fromIso, toIso)`:

```ts
const { data: lessons } = await client
	.from("lessons")
	.select("id,title,style,description,location,starts_at,ends_at,capacity,status")
	.gte("starts_at", fromIso)
	.lt("starts_at", toIso)
	.order("starts_at", { ascending: true });
```

Then call `list_lesson_availability` for the returned lesson ids and use its `approvedCount` values. Do not read all registration rows just to count seats.

`listPendingRegistrations()`:

1. Select pending registrations:

```ts
const { data: registrations } = await client
	.from("lesson_registrations")
	.select("id,lesson_id,student_id,status,requested_at,decided_by,decided_at,cancelled_at")
	.eq("status", "pending")
	.order("requested_at", { ascending: true });
```

2. Select profiles by `student_id`:

```ts
const { data: profiles } = await client
	.from("profiles")
	.select("id,full_name,phone")
	.in("id", studentIds);
```

3. Select lessons by `lesson_id`, then attach `profiles` and `lessons` to each registration.

`listProfiles()`:

```ts
const { data: profiles } = await client
	.from("profiles")
	.select("id,full_name,phone")
	.order("full_name", { ascending: true });
```

Admin role display in `AdminUsersPage` should load `admin_users` separately and merge by `user_id`.

- [ ] **Step 4: Verify TypeScript imports**

Run:

```bash
rtk npm run build
```

Expected: build may still fail because the new files are not mounted yet only if unused export lint rules are configured. If it fails, fix type/import errors in the created files before continuing.

- [ ] **Step 5: Commit service layer**

Run:

```bash
rtk git add src/features/lesson-management/types.ts src/features/lesson-management/lesson-service.ts
rtk git commit -m "feat: add lesson management service layer"
```

## Task 3: Add Auth Context and Hash Routing

**Files:**
- Create: `src/features/lesson-management/auth-context.tsx`
- Create: `src/features/lesson-management/hash-router.ts`

- [ ] **Step 1: Implement hash-route helper**

`hash-router.ts` should define a reactive route helper:

```ts
import { useEffect, useState } from "react";

export type LessonRoute = "#/login" | "#/profile" | "#/lessons" | "#/my-bookings" | "#/admin" | "#/admin/users";

const lessonRoutes = new Set<LessonRoute>(["#/login", "#/profile", "#/lessons", "#/my-bookings", "#/admin", "#/admin/users"]);

export type LessonRouteState = {
	route: LessonRoute | null;
	isAppHash: boolean;
};

export function getCurrentLessonRoute(): LessonRoute | null {
	const hash = window.location.hash;
	return lessonRoutes.has(hash as LessonRoute) ? (hash as LessonRoute) : null;
}

export function getCurrentLessonRouteState(): LessonRouteState {
	const hash = window.location.hash;
	return {
		route: getCurrentLessonRoute(),
		isAppHash: hash.startsWith("#/"),
	};
}

export function normalizeLessonRoute(fallback: LessonRoute) {
	if (window.location.hash.startsWith("#/") && !getCurrentLessonRoute()) {
		window.location.hash = fallback;
	}
}

export function useLessonRoute() {
	const [state, setState] = useState<LessonRouteState>(() => getCurrentLessonRouteState());

	useEffect(() => {
		const update = () => setState(getCurrentLessonRouteState());
		window.addEventListener("hashchange", update);
		update();
		return () => window.removeEventListener("hashchange", update);
	}, []);

	return state;
}

export function navigateToLessonRoute(route: LessonRoute) {
	window.location.hash = route;
}
```

- [ ] **Step 2: Implement auth provider**

`auth-context.tsx` should:

- Create `LessonAuthProvider`.
- Expose `useLessonAuth()`.
- Subscribe to `supabase.auth.onAuthStateChange`.
- Load profile from `profiles`.
- Load admin role from `admin_users`.
- Expose `signInWithGoogle`, `signInWithPassword`, `signUpWithPassword`, `signOut`, and `updateProfile`.
- Implement `updateProfile` by calling `updateMyProfile(fullName, phone)`.

Use the existing `supabase` export from `src/lib/supabase.ts`.

For Google OAuth, calculate the redirect URL with `URL` resolution because this repo uses Vite `base: './'`:

```ts
const redirectTo = new URL(import.meta.env.BASE_URL, window.location.href).toString();
```

Pass it to `signInWithOAuth`. After the session is restored, route users with incomplete profiles to `#/profile` and complete users to `#/lessons`.

- [ ] **Step 3: Commit auth foundation**

Run:

```bash
rtk git add src/features/lesson-management/auth-context.tsx src/features/lesson-management/hash-router.ts
rtk git commit -m "feat: add lesson auth foundation"
```

## Task 4: Add Auth and Profile Pages

**Files:**
- Create: `src/features/lesson-management/auth-pages.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Create login/register UI**

Create `LoginPage` with:

- Email input.
- Password input.
- Name input shown only in register mode.
- Phone input shown only in register mode.
- Google sign-in button.
- Submit button.
- Mode toggle between login and registration.

Use existing `Button`, `Input`, and `Label` components.

- [ ] **Step 2: Create profile completion UI**

Create `ProfilePage` with:

- `full_name` input.
- `phone` input.
- Save button.
- Sign-out button.

After saving a valid profile, navigate to `#/lessons`.

- [ ] **Step 3: Add i18n copy**

Add Hebrew, English, and Russian keys under `lessonApp.auth`, `lessonApp.profile`, and `lessonApp.errors`. Include strings for:

- Login
- Register
- Continue with Google
- Email
- Password
- Full name
- Phone
- Save profile
- Sign out
- Missing Supabase config
- Generic retry error
- RPC error messages for `AUTH_REQUIRED`, `FORBIDDEN`, `PROFILE_REQUIRED`, `LESSON_NOT_FOUND`, `LESSON_UNAVAILABLE`, `REGISTRATION_NOT_FOUND`, `REGISTRATION_CLOSED`, `CAPACITY_FULL`, `OWNER_REQUIRED`, `LAST_OWNER`, `INVALID_LESSON`, `INVALID_ROLE`, `ADMIN_NOT_FOUND`, and `ALREADY_REGISTERED`

- [ ] **Step 4: Commit auth pages**

Run:

```bash
rtk git add src/features/lesson-management/auth-pages.tsx src/i18n.ts
rtk git commit -m "feat: add lesson auth pages"
```

## Task 5: Add Student Lesson Browser and My Bookings

**Files:**
- Create: `src/features/lesson-management/student-pages.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Create student lessons page**

`StudentLessonsPage` should:

- Load `listPublishedLessons(user.id)`.
- Render future lessons as compact cards.
- Show status per current user's registration.
- Call `requestLessonRegistration` for available lessons.
- Call `cancelLessonRegistration` for pending/approved registrations.
- Refresh after each successful mutation.

- [ ] **Step 2: Create my bookings page**

`MyBookingsPage` should:

- Load `listMyRegistrations(user.id)`.
- Group upcoming bookings before past/cancelled/rejected rows.
- Include cancel action only for pending/approved upcoming lessons.

- [ ] **Step 3: Add student i18n copy**

Add copy for:

- Available lessons
- My bookings
- Request spot
- Pending approval
- Approved
- Rejected
- Cancelled
- Cancel booking
- Lesson full
- No lessons available
- No bookings yet

- [ ] **Step 4: Commit student surfaces**

Run:

```bash
rtk git add src/features/lesson-management/student-pages.tsx src/i18n.ts
rtk git commit -m "feat: add student lesson booking pages"
```

## Task 6: Add Admin Lesson Dashboard and Calendar

**Files:**
- Create: `src/features/lesson-management/admin-pages.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Create admin dashboard shell**

`AdminDashboardPage` should:

- Track selected month and selected day.
- Load lessons for the selected month through `listAdminLessons`.
- Render month grid with lesson count markers.
- Render selected-day agenda beside or below the grid.

- [ ] **Step 2: Create lesson form**

The form should support:

- Title
- Style
- Description
- Location
- Start datetime
- End datetime
- Capacity
- Status

On save, call `saveLesson(input)` and refresh the month. Publish and draft changes are represented by the `status` field passed to `saveLesson`; cancellation calls `cancelLesson(lessonId)`.

- [ ] **Step 3: Create approvals panel**

The panel should:

- Load `listPendingRegistrations()`.
- Show student name, phone, lesson title, lesson time.
- Approve through `approveLessonRegistration`.
- Reject through `rejectLessonRegistration`.
- Refresh pending list and calendar after mutation.

- [ ] **Step 4: Add admin i18n copy**

Add copy for:

- Admin
- Calendar
- Create lesson
- Edit lesson
- Publish
- Cancel lesson
- Pending approvals
- Approve
- Reject
- Capacity
- No pending approvals
- Permission denied

- [ ] **Step 5: Commit admin dashboard**

Run:

```bash
rtk git add src/features/lesson-management/admin-pages.tsx src/i18n.ts
rtk git commit -m "feat: add admin lesson dashboard"
```

## Task 7: Add Owner Admin Management Page

**Files:**
- Create: `src/features/lesson-management/admin-users-page.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Create users/admin page**

`AdminUsersPage` should:

- Require `adminRole === "owner"`.
- Load profiles and active admins.
- Show profile list with name, phone, and current admin role.
- Allow owner to set role to `admin` or `owner`.
- Allow owner to deactivate an active admin.
- Surface `LAST_OWNER` as a clear localized error.

- [ ] **Step 2: Add owner i18n copy**

Add copy for:

- Admin users
- Owner
- Promote to admin
- Promote to owner
- Deactivate admin
- Last owner cannot be removed
- Owner access required

- [ ] **Step 3: Commit admin management**

Run:

```bash
rtk git add src/features/lesson-management/admin-users-page.tsx src/i18n.ts
rtk git commit -m "feat: add admin user management"
```

## Task 8: Compose Feature App and Route Guards

**Files:**
- Create: `src/features/lesson-management/lesson-management-app.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create feature composition**

`LessonManagementApp` should:

- Wrap pages in `LessonAuthProvider`.
- Render a compact app nav with Lessons, My Bookings, Admin, Admin Users, Profile, and Sign Out where permitted.
- Route guests to `LoginPage`.
- Route authenticated users missing profile fields to `ProfilePage`.
- Block non-admins from `#/admin`.
- Block non-owners from `#/admin/users`.
- Call `normalizeLessonRoute()` for unknown `#/...` hashes after auth state resolves so guests land on `#/login` and signed-in users land on `#/lessons`.

- [ ] **Step 2: Mount from App**

In `src/App.tsx`, read lesson-management hashes with `useLessonRoute()`. If `state.isAppHash` is true, render `LessonManagementApp` inside the existing app shell even when `state.route` is null, so unknown app hashes can be normalized inside the feature app. This must rely on `hashchange` state, not a one-time `window.location.hash` read, so header clicks render immediately without requiring a reload.

- [ ] **Step 3: Commit app composition**

Run:

```bash
rtk git add src/features/lesson-management/lesson-management-app.tsx src/App.tsx
rtk git commit -m "feat: mount lesson management app"
```

## Task 9: Add Header Links, Env Docs, and Deployment Handoff

**Files:**
- Modify: `src/components/layout/site-header.tsx`
- Modify: `.env.example`
- Modify: `src/i18n.ts`
- Create: `docs/deployment/lesson-management-bootstrap.md`

- [ ] **Step 1: Add public navigation entry**

Add a header link/button to `#/lessons` using localized copy like "Book a lesson". Keep existing marketing anchors intact.

- [ ] **Step 2: Add admin/account route affordance**

When the feature auth state is not available in the marketing header, keep this simple: the public header links to `#/lessons`; authenticated app navigation handles account/admin links after entering the app.

- [ ] **Step 3: Document env vars**

Ensure `.env.example` includes:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 4: Document owner bootstrap and OAuth redirects**

Create `docs/deployment/lesson-management-bootstrap.md` with:

````markdown
# Lesson Management Bootstrap

## Supabase Auth Redirect URLs

Configure these redirect URLs in Supabase Auth before testing Google sign-in:

- Local development: `http://localhost:5173/`
- GitHub Pages: `https://khgs2411.github.io/eden_website/`

The app passes `new URL(import.meta.env.BASE_URL, window.location.href).toString()` as `redirectTo` for Google OAuth because this repo uses Vite `base: './'`.

## First Owner Bootstrap

1. Have the owner sign up or sign in once through the deployed app.
2. In Supabase Auth, copy that user's `auth.users.id`.
3. Run this SQL in the Supabase SQL Editor:

```sql
insert into public.admin_users (user_id, role, active)
values ('<owner-auth-user-id>', 'owner', true)
on conflict (user_id) do update
set role = 'owner', active = true;
```

The app intentionally has no self-promotion or public owner-creation route.
````

- [ ] **Step 5: Commit integration docs**

Run:

```bash
rtk git add src/components/layout/site-header.tsx src/i18n.ts .env.example docs/deployment/lesson-management-bootstrap.md
rtk git commit -m "feat: link lesson booking entry point"
```

## Task 10: Manual Verification and Closeout

**Files:**
- No planned source changes unless verification finds a bug

- [ ] **Step 1: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS. If it fails, fix only issues introduced by this feature.

- [ ] **Step 2: Run build**

Run:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual smoke paths**

Run the app:

```bash
rtk npm run dev
```

Manually check:

- `#/login` renders login/register UI.
- Google button starts OAuth flow when Supabase config is present.
- Google OAuth uses `new URL(import.meta.env.BASE_URL, window.location.href).toString()` as redirect target.
- Email/password form submits without client errors.
- Missing profile routes to `#/profile`.
- Missing Supabase env vars show localized configuration error on lesson-app routes.
- `#/lessons` shows published future lessons.
- A lesson at capacity renders as full for a student who is not registered, using aggregate availability counts rather than visible registration rows.
- Student request changes state to pending.
- Student cancellation changes state to cancelled.
- Non-admin opening `#/admin` sees permission state.
- Unknown app hash `#/not-a-route` normalizes to `#/login` for guests and `#/lessons` for signed-in users.
- Admin can create/edit/publish/cancel lessons.
- Admin can approve/reject pending registrations.
- Owner can open `#/admin/users`.
- Last owner deactivation shows a clear error.
- `docs/deployment/lesson-management-bootstrap.md` includes first-owner SQL and local/GitHub Pages redirect URL guidance.

- [ ] **Step 4: Final commit for verification fixes**

If verification required fixes, commit them:

```bash
rtk git status --short
rtk git add src/features/lesson-management/types.ts src/features/lesson-management/lesson-service.ts src/features/lesson-management/auth-context.tsx src/features/lesson-management/hash-router.ts src/features/lesson-management/auth-pages.tsx src/features/lesson-management/student-pages.tsx src/features/lesson-management/admin-pages.tsx src/features/lesson-management/admin-users-page.tsx src/features/lesson-management/lesson-management-app.tsx src/App.tsx src/components/layout/site-header.tsx src/i18n.ts .env.example docs/deployment/lesson-management-bootstrap.md
rtk git commit -m "fix: polish lesson management flow"
```

If no fixes were needed, skip this commit.

- [ ] **Step 5: Merge per repository workflow**

Follow `docs/deployment/development-guideline.md` exactly: no-ff merge into `master`, push, delete worktree and branch.

## Plan Self-Review

- Spec coverage: auth, profile completion, student booking, admin CRUD/calendar, admin user management, RLS, GitHub Pages hash routing, i18n, and existing marketing-site preservation are each covered by a task.
- Scope check: payments, notifications, attendance, recurring schedules, and drag-and-drop editing are excluded as specified.
- Type consistency: route names, status values, role values, and RPC names match the design spec.
- Test alignment: the user requested no dedicated tests; this plan uses lint/build/manual smoke verification only.
