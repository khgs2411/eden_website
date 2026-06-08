# Chunk 05: Verification And Docs Hardening

**Plan Set:** `../plan.md`
**Spec:** `../../../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-security-rls-membership-visibility.md`, `02-membership-ledger-cancellation-audit.md`, `03-product-manager-promotion-boundary.md`, `04-generated-class-source-integrity.md`
**Enables:** execution handoff / review closeout

## Goal

Update local verification documentation so the review fixes remain testable: security RPC privileges, member-only visibility, ledger cancellation audit, manager-promotion boundary, and generated-source integrity must be represented in the final smoke checklist.

## Source Artifacts

- Root spec: Permissions / Security, Memberships, Classes, Registration + Membership Interaction.
- Original plan: local verification and docs chunk.
- Review artifact: `../../../reviews/2026-06-08/implementation-review.md`.
- Prior chunks in this follow-up plan set.
- Code/docs paths: `docs/2026-06-06-class-management-product/local-verification.md`, `README.md`.

## Relationships

- **Depends on:** chunks 01-04 implemented and verified.
- **Enables:** ready-for-execution handoff and future audits.
- **Shared contracts:** local verification must not silently require destructive reset; security regression commands must include expected pass/fail signals.
- **Integration points:** README local setup and class-management local verification docs.

## File Responsibility Map

**Create:**
- No new file required unless implementation chooses to add a separate `security-smoke.md`. Default is to update existing verification docs.

**Modify:**
- `docs/2026-06-06-class-management-product/local-verification.md` - add follow-up security/data-integrity smoke checks.
- `README.md` - update only if local command flow or warning text changes.
- `docs/2026-06-06-class-management-product/reviews/2026-06-08/implementation-review.md` - optional: append a short "planned follow-up" link to this plan set if desired.

**Test:**
- Documentation command examples should be syntactically copyable.
- Repo validation commands still pass.

## Implementation Tasks

### Task 1: Add security regression section

**Files:**
- Modify: `docs/2026-06-06-class-management-product/local-verification.md`

- [ ] Add this section after the command order:

````markdown
## Security Regression Checks

Run these checks after applying the 2026-06-08 implementation-review fixes.

### Active Membership RPC Privilege

```bash
rtk supabase db query "select has_function_privilege('authenticated', 'public.get_active_membership_grant(uuid, uuid)', 'execute') as authenticated_can_execute;"
```

Expected: `authenticated_can_execute` is `false`.

### Member-Only Class Visibility

Use local users representing:

- an active product user without an active membership grant
- an active product user with an active membership grant

Call `classes` with each user's JWT:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <user-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"list_user"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected:

- non-member response does not include `visibility":"members_only"`
- member response may include `members_only` classes when such classes exist
````

### Task 2: Add ledger and promotion smoke sections

**Files:**
- Modify: `docs/2026-06-06-class-management-product/local-verification.md`

- [ ] Add this section:

````markdown
## Membership Ledger Regression Checks

Verify these cancellation paths with local data:

- stock membership approved registration cancelled before class start writes `registration_cancelled` with positive `stock_delta`
- infinite or limited membership-backed registration cancellation writes `registration_cancelled` with `stock_delta = 0`
- manager class cancellation writes `class_cancelled_restore` for every membership-backed registration, with positive stock delta only when stock was consumed

Inspect ledger rows:

```bash
rtk supabase db query "select event_type, stock_delta, class_id, registration_id from public.membership_ledger order by created_at desc limit 20;"
```

Expected: cancellation/restoration rows exist for both stock and non-stock membership-backed registrations.

## Manager Promotion Boundary Checks

`manager-promote-manager` should promote only existing active product users. It should not create product access for arbitrary auth users.

Expected:

- target auth user without a `product_users` row returns 404 `not_found`
- target active `product_users` row returns role `manager`
- `admin-promote-manager` still works for platform-admin bootstrap
````

### Task 3: Add generated-source integrity checks

**Files:**
- Modify: `docs/2026-06-06-class-management-product/local-verification.md`

- [ ] Add this section:

````markdown
## Generated Class Source Integrity Checks

Check for invalid generated class source references:

```bash
rtk supabase db query "select c.id, c.product_id, c.schedule_id from public.classes c left join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and s.id is null;"
```

Expected: zero rows.

Confirm source constraints exist:

```bash
rtk supabase db query "select conname from pg_constraint where conname in ('classes_template_product_fk','schedules_id_template_product_unique','classes_schedule_product_fk','classes_generated_schedule_template_fk','classes_generated_source_consistency') order by conname;"
```

Expected: rows for `classes_generated_source_consistency`, `classes_generated_schedule_template_fk`, `classes_schedule_product_fk`, `classes_template_product_fk`, and `schedules_id_template_product_unique`.

Check generated class template alignment:

```bash
rtk supabase db query "select c.id from public.classes c join public.schedules s on s.id = c.schedule_id and s.product_id = c.product_id where c.schedule_id is not null and c.template_id is distinct from s.template_id;"
```

Expected: zero rows.

Check template product compatibility:

```bash
rtk supabase db query "select c.id, c.product_id, c.template_id from public.classes c left join public.class_templates t on t.id = c.template_id and t.product_id = c.product_id where c.template_id is not null and t.id is null;"
```

Expected: zero rows.

Check generated source-field consistency:

```bash
rtk supabase db query "select id, product_id, template_id, schedule_id, generated_for_date, source_timezone from public.classes where not ((schedule_id is null and generated_for_date is null and source_timezone is null) or (schedule_id is not null and template_id is not null and generated_for_date is not null and source_timezone is not null));"
```

Expected: zero rows.

Manager class CRUD should reject generated source fields:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"create","name":"Manual class","starts_at":"2026-07-01T17:00:00Z","ends_at":"2026-07-01T18:00:00Z","capacity":10,"schedule_id":"00000000-0000-0000-0000-000000000000"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request`; `schedule_id` is controlled by schedule generation.

Generated class CRUD should reject template changes:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Authorization: Bearer <manager-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden","action":"update","class_id":"<generated-class-id>","template_id":"<same-product-template-id>"}' \
  http://127.0.0.1:54321/functions/v1/classes
```

Expected: 400 `bad_request`; `template_id` is controlled by schedule generation for generated classes.
````

### Task 4: Update README only if needed

**Files:**
- Modify: `README.md` if command flow changed

- [ ] If no command flow changed, leave `README.md` unchanged.
- [ ] If verification wording is added, keep it short and point to the detailed local verification doc:

```markdown
Security and data-integrity regression checks for the class-management review fixes are documented in `docs/2026-06-06-class-management-product/local-verification.md`.
```

## Verification

- Run: `npm run lint`
  - Expected: pass.

- Run: `npm run build`
  - Expected: pass. Existing Vite chunk-size warning is acceptable.

- Run: `rtk supabase db lint`
  - Expected: no fatal findings.

- Run the documented privilege check:

```bash
rtk supabase db query "select has_function_privilege('authenticated', 'public.get_active_membership_grant(uuid, uuid)', 'execute') as authenticated_can_execute;"
```

Expected: `authenticated_can_execute = false`.

- Read the updated local verification doc:

```bash
rtk read docs/2026-06-06-class-management-product/local-verification.md
```

Expected: sections exist for security regression checks, membership ledger regression checks, manager promotion boundary checks, and generated class source integrity checks.

## Acceptance Criteria Covered

- Local Supabase verification path tracks the review fixes.
- Security, data-integrity, and ledger regressions have repeatable checks.
- Docs distinguish non-destructive checks from optional destructive reset.

## Risks And Rollback

- Docs can drift if they prescribe commands not supported by the current implementation. Run the low-risk SQL checks before marking this chunk complete.
- Rollback by reverting doc changes only; implementation chunks remain intact.

## Non-Goals

- New implementation behavior.
- Adding a dedicated automated test runner.
- Rewriting README beyond necessary verification references.

## Type And Name Consistency

Use the same finding names and function names as the review: `get_active_membership_grant`, `members_only`, `registration_cancelled`, `class_cancelled_restore`, `manager-promote-manager`, and `classes_schedule_product_fk`.
