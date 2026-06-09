# Membership Type Editing Without Retroactive Grant Changes Design

Status: Final design for implementation planning.

Date: 2026-06-09

## Goal

Allow a manager to edit a membership type after it has been created while preserving the entitlement values already issued to existing membership grants. Edits affect future grants and manager-facing type metadata, not previously granted stock, validity windows, consumed stock, grant statuses, or historical ledger rows.

## Current Context

The current class-management product already separates membership types from membership grants:

- `backend/supabase/migrations/20260607132920_membership_ledger.sql` creates `membership_types`, `membership_grants`, and `membership_ledger`.
- `membership_grants` stores the grant-time entitlement values: `mode`, `valid_from`, `valid_until`, `total_stock`, `remaining_stock`, and `status`.
- `grant_membership` copies mode/defaults from the selected active membership type into a concrete grant row.
- `upgrade_membership` replaces the previous active grant with a new grant and intentionally does not preserve unused value.
- `backend/supabase/functions/memberships/index.ts` already exposes `update_type`, but the frontend package does not use it.
- `packages/class-management-react/src/components/manager/membership-types.tsx` only supports create, list, refresh, and deactivate.
- `packages/class-management-react/src/components/manager/membership-grants.tsx` and `product-users-list.tsx` display grant values from `membership_grants`, but they display the current membership type name by looking up `membership_type_id`.

The parent product spec says upgrades immediately replace an active grant and leave carryover/value handling outside v1. This task is not an upgrade carryover feature. It is a membership type edit feature with a future-only default contract.

## User-Facing Behavior

Managers can edit a created membership type from the Memberships manager surface:

- Edit the membership type `name`.
- Edit `default_stock` only for `stock` and `limited_stock` types.
- Edit `default_duration_days` only for `limited` and `limited_stock` types.
- Keep `mode` immutable after creation.
- See messaging that edited defaults apply to future grants only.
- Continue to deactivate inactive/discontinued membership types as today.

Existing grants keep their issued entitlement values:

- Stock grants keep their existing `total_stock` and `remaining_stock`.
- Limited grants keep their existing `valid_until`.
- Limited-stock grants keep both existing stock and validity values.
- Infinite grants remain infinite.
- Grant status and ledger history are not rewritten by type edits.

When a manager edits a membership type name, existing grants may show the current type name because grants reference `membership_type_id`. That display label is not the granted entitlement. The implementation should keep the displayed grant entitlement values visible so the manager can verify what was actually granted.

## Technical Design

### Backend Contract

Use the existing `memberships` Edge Function action `update_type` as the supported manager API for this feature. Harden it so it explicitly enforces the future-only type-edit contract:

- Requires product manager context through the existing `requireProductManager(ctx)` path.
- Updates only the target row where `product_id = ctx.product.id`.
- Allows edits to `name`, `default_stock`, and `default_duration_days`.
- Does not allow `mode` changes.
- Rejects any `mode` field in an `update_type` payload with `400 bad_request`.
- Applies default-field validation against the membership type's existing mode:
  - For a mode-supported default field, an omitted field leaves the current value unchanged, `null` clears the default, and a non-null value must be a positive integer.
  - For a mode-unsupported default field, an omitted field leaves the current value unchanged, `null` is accepted to keep/clear the stored value as `null`, and any non-null value is rejected with `400 bad_request`.
  - `stock`: supports `default_stock`; rejects non-null `default_duration_days`.
  - `limited_stock`: supports both `default_stock` and `default_duration_days`.
  - `limited`: supports `default_duration_days`; rejects non-null `default_stock`.
  - `infinite`: rejects non-null `default_stock` and non-null `default_duration_days`.
- Does not update `membership_grants`.
- Does not insert membership ledger rows because no user entitlement changes.

The implementation can satisfy this by first loading the current membership type, building a mode-aware update object, and writing only the type row. No schema migration is required for entitlement preservation because grant rows already store the issued values.

Nullable supported defaults preserve the current schema behavior: a manager can clear a default, but future grant creation for stock or duration modes still needs either a resolvable type default or a grant-time override.

### Frontend Contract

Extend `MembershipTypes` in the reusable frontend package:

- Add an inline edit action on each membership type row.
- Reuse the existing create form shape for editable fields where practical.
- Disable the mode selector while editing existing types.
- Disable irrelevant default fields based on the immutable mode.
- Submit `memberships` `update_type` with `membership_type_id`, `name`, and only the default fields relevant to the type's immutable mode.
- Refresh membership types and dependent membership views after save.
- Keep the existing create and deactivate workflows unchanged.
- Use package-local labels because these components are currently not wired through `src/i18n.ts`.

The playground already renders `ManagerOperationsDashboard view="memberships"`, so no new playground route is needed.

## Data / State

No new table or migration is required.

The important persistence boundary is already present:

- Membership type defaults live on `membership_types`.
- Issued entitlements live on `membership_grants`.
- Membership-backed actions live in `membership_ledger`.

Implementation verification must prove that updating `membership_types.default_stock`, `membership_types.default_duration_days`, or `membership_types.name` does not mutate existing `membership_grants` entitlement columns.

## Permissions / Security

Only product managers and platform admins operating through manager context can edit membership types. Product scoping must remain enforced by the Edge Function and the `product_id` filter on the update.

Frontend controls are convenience only. The backend must reject invalid update payloads even if a caller bypasses the UI.

Direct table writes remain unsupported for consumer websites. The frontend continues to call Edge Functions only.

## Error Handling

Expected backend errors:

- Missing `membership_type_id`: `400 bad_request`.
- Empty `name`: `400 bad_request`.
- Wrong product or missing type: `404 not_found`.
- `mode` supplied to `update_type`: `400 bad_request`.
- Non-null default field unsupported by the immutable mode, non-positive integer, or non-integer default value: `400 bad_request`.
- Unsupported membership action: existing `400 bad_request`.

The manager UI should display the backend message using the existing membership component message pattern.

## Testing Strategy

Implementation verification should include:

- `rtk npm run build:package`
- `rtk npm run build:playground`
- `rtk npm run lint`
- `rtk npm run build`
- from `backend/`, `rtk npm run supabase:migrations`
- when a local Supabase stack is available, SQL or Edge Function smoke that:
  - creates a stock membership type and grants it to a product user
  - edits that membership type's future default stock
  - confirms the existing grant keeps its original `total_stock` and `remaining_stock`
  - confirms a new grant receives the edited default
  - attempts to send a non-null default field unsupported by the type's immutable mode and receives `400 bad_request`
  - repeats the same shape for limited duration when practical

## Planning Boundary Guidance

Use two implementation chunks:

1. Backend update-type contract and grant-preservation smoke: harden `update_type`, document the no-migration choice, and verify old grant rows are unchanged after type edits.
2. Manager membership type edit UI: add the edit interaction to `MembershipTypes`, wire `update_type`, refresh dependent views, and validate package/playground builds.

## Acceptance Criteria

- Managers can edit an existing membership type's name and mode-appropriate defaults.
- Membership type mode remains immutable after creation.
- Editing a membership type does not update existing membership grants' `mode`, `valid_from`, `valid_until`, `total_stock`, `remaining_stock`, or `status`.
- Future grants use the edited defaults.
- Existing grant/upgrade/revoke behavior remains unchanged.
- Product scoping and manager-only access remain enforced server-side.

## Assumptions

- "Membership that was created" means a membership type created by a manager, not an individual user's membership grant.
- "Without changing what was already granted" means existing grant entitlement rows remain unchanged.
- A display name change may affect type labels shown for old grants, but it does not change the granted entitlement values.

## Non-Blocking Risks

- If the product later needs historical display names for old grants, a separate grant-snapshot field can be designed. This task does not require that migration because entitlement values are already snapshot on grant rows.
- The package has no dedicated test runner yet, so implementation relies on TypeScript builds, linting, and Supabase smoke checks.
