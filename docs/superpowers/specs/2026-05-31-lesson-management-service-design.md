# Lesson Management Service Design

**Date:** 2026-05-31
**Status:** Ready for development
**Project:** Eden website

## 1. Summary

Build a simple Supabase-backed lesson management service inside the existing Vite, React, and TypeScript site. The service adds authentication, student lesson booking, admin lesson CRUD, an admin user-management page, and role-based permissions.

The implementation should stay deliberately small. This is not a full studio operations platform, payments system, package tracker, or attendance product. Lessons are dated/time-based items. Students request a spot, admins approve or reject the request, and students can cancel their own active request before the lesson starts.

## 2. Context

The current app is a multilingual marketing site with:

- Vite, React, TypeScript, Tailwind CSS, and `@supabase/supabase-js`.
- Existing copy in `src/i18n.ts`.
- Existing Supabase client in `src/lib/supabase.ts`.
- Existing static lesson cards in `src/data/site.ts`.
- Existing lead-capture table `public.lesson_signups`.
- GitHub Pages deployment from `master`.

The new feature should reuse the current visual direction from `docs/design-guide.md`: bold, compact, dance-oriented UI for public/student surfaces, and a denser but restrained admin surface.

## 3. Goals

- Allow users to sign in with Google or register/sign in with email and password.
- Collect and store a required phone number on the user profile after signup or first login.
- Let signed-in students view available lessons and request/cancel a lesson registration.
- Let admins create, update, publish, cancel, and inspect lessons.
- Let admins approve or reject pending lesson registrations.
- Let owners manage which users are admins.
- Protect all write operations with Supabase Row Level Security.
- Keep routing compatible with GitHub Pages.

## 4. Non-Goals

- Payments, subscriptions, lesson packages, coupon logic, or attendance reports.
- Push notifications, email reminders, or SMS.
- Drag-and-drop calendar editing.
- Multi-teacher payroll, rooms, recurring lesson generation, or resource scheduling.
- A standalone backend service outside Supabase.
- A dedicated test suite for this feature. The implementation may still use lint/build checks if the worker decides they are useful.

## 5. Key Decisions

### 5.1 Routing

Use client-side hash routes instead of path routes:

- `#/login`
- `#/profile`
- `#/lessons`
- `#/my-bookings`
- `#/admin`
- `#/admin/users`

This avoids GitHub Pages rewrite issues and keeps the feature scoped to the existing single-page app.

### 5.2 Auth and Profile

Use Supabase Auth for identity:

- Google OAuth via `signInWithOAuth({ provider: "google", options: { redirectTo } })`.
- Email/password via `signUp` and `signInWithPassword`.
- Phone is stored in `public.profiles`, not used as a password credential.

If an authenticated user lacks `full_name` or `phone`, the app routes them to profile completion before booking.

OAuth redirect behavior:

- `redirectTo` is `new URL(import.meta.env.BASE_URL, window.location.href).toString()`. This is required because the repo's Vite config uses `base: './'`.
- Supabase Auth redirect URLs must include `http://localhost:5173/` and `https://khgs2411.github.io/eden_website/` before Google sign-in is considered configured.
- After Supabase restores the session, the hash router sends users with incomplete profiles to `#/profile`; complete profiles go to `#/lessons`.
- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, lesson-app routes show a localized configuration error instead of rendering broken forms.

### 5.3 Admin Authorization

Admin authorization is database-backed:

- `public.admin_users` stores admin users.
- Roles are `owner` and `admin`.
- RLS and helper functions check this table.

Do not authorize admin access from `raw_user_meta_data` or client state. Supabase user metadata is user-editable and must not decide permissions.

### 5.4 Booking Approval

Lesson capacity is enforced when an admin approves a registration:

- Student creates a `pending` registration.
- Admin approves it only if approved registrations are below lesson capacity.
- Admin can reject a request.
- Student cancellation sets status to `cancelled`.

No separate waitlist is needed in v1. Pending registrations are the manual queue.

### 5.5 Write Boundary

Supabase table access is read-oriented for client code. All feature writes that encode business rules go through RPCs:

- Profile updates use `public.update_my_profile`.
- Lesson create/update/publish/cancel use `public.save_lesson` and `public.cancel_lesson`.
- Student booking/cancellation use registration RPCs.
- Admin approval/rejection and owner admin-management use RPCs.

The client must not directly insert or update `profiles`, `lessons`, `lesson_registrations`, or `admin_users`. This keeps profile completion, status transitions, audit fields, capacity checks, and last-owner protection in the database.

## 6. Database Design

### 6.1 `public.profiles`

Stores app-level profile fields for every authenticated user.

Columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `full_name text`
- `phone text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- Users can select their own profile; profile updates happen only through `public.update_my_profile`.
- Admins can select profiles for management and approval context.
- A trigger creates a profile row for every new auth user.
- `full_name` and `phone` are nullable at table level so OAuth users can be created before profile completion; booking RPCs reject users until both values are non-empty.

### 6.2 `public.admin_users`

Stores authorization roles.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `role text not null check (role in ('owner', 'admin'))`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `created_by uuid references auth.users(id)`

Rules:

- Active admins can read admin rows.
- Only owners can add, deactivate, or change admin roles.
- At least one owner must remain active. This is enforced through RPC logic, not direct client updates.

### 6.3 `public.lessons`

Stores scheduled lessons.

Columns:

- `id bigint generated by default as identity primary key`
- `title text not null`
- `style text not null`
- `description text`
- `location text not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `capacity integer not null check (capacity > 0)`
- `status text not null default 'draft' check (status in ('draft', 'published', 'cancelled'))`
- `created_by uuid references auth.users(id)`
- `updated_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `check (ends_at > starts_at)`

Rules:

- Authenticated users can read future published lessons.
- Admins can read all lessons.
- Admins create, update, publish, and cancel lessons only through RPCs.
- Cancelled lessons remain visible to admins and to affected students.
- `created_by` and `updated_by` are trusted audit fields set from `auth.uid()` inside lesson RPCs, not from client-supplied values.

### 6.4 `public.lesson_registrations`

Stores student booking requests.

Columns:

- `id bigint generated by default as identity primary key`
- `lesson_id bigint not null references public.lessons(id) on delete cascade`
- `student_id uuid not null references auth.users(id) on delete cascade`
- `status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled'))`
- `requested_at timestamptz not null default now()`
- `decided_by uuid references auth.users(id)`
- `decided_at timestamptz`
- `cancelled_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes and constraints:

- Unique active registration per student per lesson for statuses `pending` and `approved`.
- Index by `(lesson_id, status)`.
- Index by `(student_id, requested_at desc)`.

Rules:

- Students can read their own registrations.
- Students request a pending registration for themselves on future published lessons only through `public.request_lesson_registration`.
- Students cancel their own pending or approved registration before `starts_at` only through `public.cancel_lesson_registration`.
- Admins can read all registrations.
- Admin approval/rejection happens through RPCs so capacity is enforced atomically.
- Rejected and cancelled rows are immutable history. A later request creates a new pending row because the active unique constraint applies only to `pending` and `approved`.

## 7. RPC/API Boundary

Use direct Supabase table access for ordinary row reads and RPCs for all writes. The one read exception is aggregate lesson availability: approved counts use `public.list_lesson_availability` so students can see full/available states without reading other students' registration rows.

RPCs:

- `public.is_admin()` returns whether `auth.uid()` is an active admin or owner.
- `public.is_owner()` returns whether `auth.uid()` is an active owner.
- `public.update_my_profile(p_full_name text, p_phone text)` updates the caller's profile after trimming non-empty fields.
- `public.save_lesson(p_lesson_id bigint, p_title text, p_style text, p_description text, p_location text, p_starts_at timestamptz, p_ends_at timestamptz, p_capacity integer, p_status text)` creates a lesson when `p_lesson_id` is null, updates it otherwise, sets audit fields from `auth.uid()`, and rejects invalid date/capacity/status values.
- `public.cancel_lesson(p_lesson_id bigint)` sets a lesson to `cancelled` and records `updated_by`.
- `public.list_lesson_availability(p_lesson_ids bigint[])` returns approved registration counts for visible lessons without exposing registration rows for other students.
- `public.request_lesson_registration(p_lesson_id bigint)` creates a new pending registration for the caller.
- `public.cancel_lesson_registration(p_registration_id bigint)` cancels the caller's active registration before lesson start.
- `public.approve_lesson_registration(p_registration_id bigint)` approves a pending registration if capacity remains.
- `public.reject_lesson_registration(p_registration_id bigint)` rejects a pending registration.
- `public.upsert_admin_user(p_user_id uuid, p_role text)` owner-only admin management.
- `public.deactivate_admin_user(p_user_id uuid)` owner-only admin deactivation with last-owner protection.

Owner-management RPCs lock the relevant `admin_users` rows before changing owner state so concurrent owner removals cannot deactivate the final owner.

RPCs return JSON with:

- `ok: boolean`
- `error?: string`
- relevant ids or count fields on success

Expected error codes:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `PROFILE_REQUIRED`
- `LESSON_NOT_FOUND`
- `LESSON_UNAVAILABLE`
- `REGISTRATION_NOT_FOUND`
- `REGISTRATION_CLOSED`
- `CAPACITY_FULL`
- `OWNER_REQUIRED`
- `LAST_OWNER`
- `INVALID_LESSON`
- `INVALID_ROLE`
- `ADMIN_NOT_FOUND`
- `ALREADY_REGISTERED`

## 8. Frontend Architecture

### 8.1 Auth Layer

Create a small auth provider around Supabase session state:

- Holds `session`, `user`, `profile`, `adminRole`, and loading state.
- Subscribes to `supabase.auth.onAuthStateChange`.
- Fetches profile/admin role after session changes.
- Exposes auth actions for Google, email/password, sign out, and profile update.

### 8.2 Route Layer

Add a minimal hash router helper instead of introducing React Router:

- Reads `window.location.hash`.
- Normalizes unknown app hashes to `#/lessons` for signed-in users or `#/login` for guests.
- Keeps the existing marketing home as the first screen for non-app navigation.

### 8.3 Student Surfaces

Student pages:

- Login/register page.
- Profile completion page.
- Lesson browser with future published lessons and each lesson's registration status.
- My bookings page grouped by upcoming and past/cancelled.

Student lesson card states:

- `available`: show request button.
- `pending`: show pending approval and cancel button.
- `approved`: show approved and cancel button.
- `cancelled` or `rejected`: show historical status and allow a new request that creates a new pending row.
- `full`: show full state when approved count reaches capacity.

### 8.4 Admin Surfaces

Admin pages:

- Dashboard/calendar at `#/admin`.
- Users/admin management at `#/admin/users`.

Admin dashboard includes:

- Month view with days containing lessons.
- Selected-day agenda.
- Lesson create/edit form.
- Pending registrations panel.
- Capacity summary for each lesson.
- Actions to publish, cancel, approve, and reject.
- Calendar UX should borrow the simple month-grid plus selected-day agenda pattern from Wodnix `AthleteCalendarScreen` and Instincts `CoachLessonsScreen`, not their larger gym/programming lifecycle.

Admin management includes:

- User search/list from profiles.
- Active admin list.
- Promote to admin/owner.
- Deactivate admin.
- Last-owner protection surfaced as a clear error.

## 9. UI and Copy

All visible copy must be added to `src/i18n.ts` for Hebrew, English, and Russian.

Public/student UI should reuse the existing compact card language and dance-site feel. Admin UI can be more utilitarian: tables, segmented controls, compact forms, and clear status chips.

Avoid nested cards and oversized SaaS-style hero sections. This feature is an operational tool inside the site, not a second landing page.

The feature may render inside the existing app shell. The admin screen can use the current `lg:max-w-[820px]` width but should favor dense controls and tables over mobile-only card stacking on larger screens.

## 10. Error Handling

Frontend error handling should map RPC codes to clear localized text:

- Not signed in: route to login.
- Missing profile: route to profile completion.
- Capacity full: tell the user the lesson is full.
- Already registered: refresh registration state.
- Forbidden admin action: show permission error and keep the user on the current page.
- Missing Supabase configuration: show a localized setup error on lesson-app routes and do not submit auth or booking forms.
- Network/Supabase errors: show a generic retry message and keep local state unchanged.

## 11. Security Requirements

- Enable RLS on every new public table.
- Grant only read privileges needed by `authenticated` for app tables; feature writes happen through RPC execution grants. `anon` does not need Data API access to lessons because the authenticated lesson browser is the Supabase-backed surface.
- Never expose service role keys to the client.
- Never base admin authorization on user-editable metadata.
- Use `auth.uid()` inside RLS/RPCs.
- Use `security definer` functions carefully with explicit `set search_path = public`.
- Approval must lock or otherwise atomically check capacity to prevent overbooking.
- Non-admin users must not be able to mutate lessons, registrations, or admin roles by bypassing the UI.

## 12. Operational Bootstrap

The first owner is bootstrapped after a real user account exists:

1. The owner signs up or signs in once through the deployed app.
2. An operator reads that user's UUID from Supabase Auth.
3. The operator runs a one-time SQL insert in Supabase SQL Editor:

```sql
insert into public.admin_users (user_id, role, active)
values ('<owner-auth-user-id>', 'owner', true)
on conflict (user_id) do update
set role = 'owner', active = true;
```

The implementation must document this as the deployment handoff step. The app does not include public self-promotion, invite codes, or auto-owner creation.

## 13. Acceptance Criteria

- A visitor can sign in with Google.
- Google sign-in redirects correctly in local development and on the GitHub Pages deployment URL.
- A visitor can register/sign in with email and password.
- A signed-in user with missing phone/name is asked to complete profile before booking.
- A student can see future published lessons.
- Student lesson cards show full/available state from aggregate availability counts without exposing other students' registration rows.
- A student can request a spot in a lesson.
- A student can cancel their own pending or approved registration before the lesson starts.
- An admin can create a lesson.
- An admin can update lesson details.
- An admin can publish or cancel a lesson.
- An admin can view lessons in a calendar-style page.
- An admin can approve or reject pending lesson registrations.
- Capacity cannot be exceeded by approvals.
- A non-admin cannot access admin pages or admin mutations.
- An owner can add and deactivate admins.
- The final active owner cannot be deactivated, including under concurrent owner-management attempts.
- First-owner bootstrap is documented and verified after deployment.
- Missing Supabase environment variables produce a clear localized configuration state.
- The app remains compatible with GitHub Pages routing.

## 14. Implementation Notes

- Keep the old `lesson_signups` lead-capture table intact unless a later migration deliberately retires it.
- Prefer new files under `src/features/lesson-management/` for the feature surface.
- Keep shared primitives in `src/components/ui/` only when genuinely reusable.
- The existing static marketing lesson schedule may remain as-is for the public landing page. The authenticated lesson browser should read from Supabase.
- Use the operational bootstrap flow above for the first owner.
