# Chunk 01: Backend Update-Type Preservation

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** `02-manager-membership-type-edit-ui.md`

## Goal

Harden the existing `memberships` `update_type` manager action so membership type edits are explicitly mode-aware, product-scoped, and future-only, then verify existing membership grant entitlement rows remain unchanged after a type edit.

## Source Artifacts

- Spec: Backend Contract, Data / State, Permissions / Security, Acceptance Criteria.
- Agenda: Questions 1, 2, 3, and 5.
- Context: Membership Type, Membership Grant, Membership Ledger.
- Existing backend:
  - `backend/supabase/functions/memberships/index.ts`
  - `backend/supabase/migrations/20260607132920_membership_ledger.sql`
- Backend package scripts: `backend/package.json`

## Relationships

- **Depends on:** Existing membership schema and Edge Function manager guard.
- **Enables:** UI can safely call `update_type` without needing grant-edit behavior.
- **Shared contracts:** `update_type`, `MembershipMode`, `MembershipTypeRow`, mode-specific default fields.
- **Integration points:** `grant_membership` must keep using edited defaults only for future grant rows.

## File Responsibility Map

**Create:**
- No production files.

**Modify:**
- `backend/supabase/functions/memberships/index.ts` - load the current membership type before update, validate editable fields against immutable mode, and update only `membership_types`.
- `backend/SMOKE.md` or `docs/2026-06-06-class-management-product/local-verification.md` - add a concise membership type edit preservation smoke if the repo's existing verification docs are updated during implementation.

**Test:**
- Local Supabase smoke through Edge Function or SQL against `membership_types`, `membership_grants`, and `membership_ledger`.

## Implementation Tasks

### Task 1: Harden `update_type`

**Files:**
- Modify: `backend/supabase/functions/memberships/index.ts`

- [ ] Add this helper near `optionalPositiveInteger` so incompatible non-null defaults fail loudly:

```ts
function unsupportedDefaultField(value: unknown, field: string, mode: MembershipMode): null {
	if (value !== null) {
		throw new ApiError(400, "bad_request", `${field} is not supported for ${mode} membership types.`);
	}

	return null;
}
```

- [ ] Replace the current direct `update_type` branch with a load-then-update flow shaped like this:

```ts
if (action === "update_type") {
	const id = requireString(body.id ?? body.membership_type_id, "membership_type_id");
	const { data: existing, error: loadError } = await supabase
		.from("membership_types")
		.select("*")
		.eq("product_id", ctx.product.id)
		.eq("id", id)
		.maybeSingle();

	if (loadError) {
		throw new ApiError(500, "internal_error", "Could not load membership type.");
	}

	if (!existing) {
		throw new ApiError(404, "not_found", "Membership type was not found.");
	}

	const membershipType = existing as MembershipTypeRow;

	if (body.mode !== undefined) {
		throw new ApiError(400, "bad_request", "mode cannot be changed.");
	}

	const update: {
		name?: string;
		default_stock?: number | null;
		default_duration_days?: number | null;
	} = {};

	if (body.name !== undefined) {
		update.name = requireString(body.name, "name");
	}

	if (body.default_stock !== undefined) {
		if (membershipType.mode !== "stock" && membershipType.mode !== "limited_stock") {
			update.default_stock = unsupportedDefaultField(body.default_stock, "default_stock", membershipType.mode);
		} else {
			update.default_stock = optionalPositiveInteger(body.default_stock, "default_stock");
		}
	}

	if (body.default_duration_days !== undefined) {
		if (membershipType.mode !== "limited" && membershipType.mode !== "limited_stock") {
			update.default_duration_days = unsupportedDefaultField(body.default_duration_days, "default_duration_days", membershipType.mode);
		} else {
			update.default_duration_days = optionalPositiveInteger(body.default_duration_days, "default_duration_days");
		}
	}

	const { data, error } = await supabase
		.from("membership_types")
		.update(update)
		.eq("product_id", ctx.product.id)
		.eq("id", id)
		.select("*")
		.maybeSingle();

	if (error) {
		throw new ApiError(500, "internal_error", "Could not update membership type.");
	}

	if (!data) {
		throw new ApiError(404, "not_found", "Membership type was not found.");
	}

	return jsonOk({ membership_type: data as MembershipTypeRow }, { headers });
}
```

- [ ] Keep `mode` creation-only. If `mode` is present in an `update_type` payload, return `400 bad_request` instead of silently ignoring it.
- [ ] Preserve the explicit default-field contract:
  - Supported default fields may be omitted, cleared with `null`, or set to positive integers.
  - Unsupported default fields may be omitted or sent as `null`.
  - Unsupported non-null default fields must return `400 bad_request`.
- [ ] Do not update `membership_grants` in this branch.
- [ ] Do not write `membership_ledger` rows in this branch because no user grant is changing.

### Task 2: Verify preservation with local smoke

**Files:**
- Test: local Supabase stack through SQL or Edge Function calls.

- [ ] Run from the repository root:

```bash
rtk npm run build:package
```

Expected: package build exits 0.

- [ ] Run from `backend/`:

```bash
rtk npm run supabase:migrations
```

Expected: Supabase CLI lists local migrations and exits 0.

- [ ] When a local Supabase stack and manager JWT are available, run an Edge Function smoke equivalent to:

```bash
curl -sS -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' \
	-d '{"product_key":"eden","action":"update_type","membership_type_id":"<type-id>","name":"Updated Stock Pack","default_stock":12}' \
	http://127.0.0.1:54321/functions/v1/memberships
```

Expected: response wrapper has `error: null`, returned `membership_type.default_stock` is `12`, and returned mode is unchanged.

- [ ] Run a negative smoke against a type whose mode does not support the supplied non-null default field:

```bash
curl -sS -H 'Origin: http://localhost:5173' -H 'Authorization: Bearer <manager-jwt>' -H 'Content-Type: application/json' \
	-d '{"product_key":"eden","action":"update_type","membership_type_id":"<infinite-or-limited-type-id>","default_stock":12}' \
	http://127.0.0.1:54321/functions/v1/memberships
```

Expected: response wrapper has `data: null`, `error.code` is `bad_request`, and the message names `default_stock` as unsupported for the type mode.

- [ ] Verify old grant entitlement fields using SQL or an API read:

```sql
select mode, valid_from, valid_until, total_stock, remaining_stock, status
from public.membership_grants
where id = '<existing-grant-id>';
```

Expected: values match the pre-edit snapshot.

- [ ] Create a new grant of the same type after the edit.

Expected: new grant receives the edited future default values while the old grant remains unchanged.

## Verification

- Run: `rtk npm run build:package`
  - Expected: exits 0.
- Run from `backend/`: `rtk npm run supabase:migrations`
  - Expected: exits 0 and lists local migrations.
- Optional when local stack is available: Edge Function or SQL smoke for type edit preservation.
  - Expected: existing grant entitlement columns are unchanged; a future grant receives edited defaults; incompatible non-null default fields return `400 bad_request`.

## Acceptance Criteria Covered

- Managers can edit mode-appropriate defaults through the backend.
- Membership type mode remains immutable.
- Existing grants keep entitlement fields.
- Future grants use edited defaults.
- Product scoping and manager-only access remain server-side.
- Invalid mode/default update payloads are rejected server-side.

## Risks And Rollback

- Risk: Existing callers that send incompatible non-null defaults to `update_type` will start receiving `400 bad_request`. This is intentional because the backend contract must not silently accept invalid future-grant semantics.
- Risk: Runtime smoke may be unavailable in a worker. If so, record verification as environment-blocked rather than product-failed.
- Rollback: revert only the `update_type` branch changes in `backend/supabase/functions/memberships/index.ts`.

## Non-Goals

- Individual grant editing.
- Mode migration.
- Historical display-name snapshots.
- Payment, credit, refund, or value carryover.

## Type And Name Consistency

Use the existing names exactly: `MembershipMode`, `MembershipTypeRow`, `MembershipRequest`, `update_type`, `membership_type_id`, `default_stock`, and `default_duration_days`.
