# Chunk 03: Product Manager Promotion Boundary

**Plan Set:** `../plan.md`
**Spec:** `../../../spec.md`
**Status:** Ready For Implementation
**Depends on:** None
**Enables:** final verification

## Goal

Restrict product-manager promotion to existing active Product Users in the same Product while preserving Platform Admin authority to assign/bootstrap managers. Managers can promote a known Product User; they cannot create product access for arbitrary global Supabase Auth users.

## Source Artifacts

- Root spec: Users and Roles, Product Access Table, Permissions / Security.
- Agenda decisions: Product bootstrap and first manager assignment, domain signup association, product access and role table shape.
- Context terms: Platform Admin, Product User, Manager.
- ADR 0001: shared Supabase product scoping and product-scoped roles.
- Review finding: 4 in `../../../reviews/2026-06-08/implementation-review.md`.
- Code paths: `supabase/functions/_shared/context.ts`, `supabase/functions/admin-promote-manager/index.ts`, `supabase/functions/manager-promote-manager/index.ts`.

## Relationships

- **Depends on:** existing product access table and Edge Function context helpers.
- **Enables:** final role-boundary verification.
- **Shared contracts:** Platform Admin can create or promote product manager rows; Product Manager can only promote existing active Product Users.
- **Integration points:** manager promotion Edge Function, admin promotion Edge Function, `product_users`.

## File Responsibility Map

**Create:**
- No migration expected unless implementation chooses an RPC instead of Edge Function table updates.

**Modify:**
- `supabase/functions/_shared/context.ts` - split promotion helpers into platform-admin upsert and manager-only update.
- `supabase/functions/admin-promote-manager/index.ts` - keep bootstrap/upsert behavior.
- `supabase/functions/manager-promote-manager/index.ts` - call the manager-safe helper.

**Test:**
- Edge Function smoke for manager and admin promotion.
- Optional SQL inspection of `product_users`.

## Implementation Tasks

### Task 1: Split promotion helpers

**Files:**
- Modify: `supabase/functions/_shared/context.ts`

- [ ] Replace `promoteProductManager` with two helpers:

```ts
export async function assignProductManagerByPlatformAdmin(
  productId: string,
  userId: string,
): Promise<ProductUserRow> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("product_users")
    .upsert(
      {
        product_id: productId,
        user_id: userId,
        role: "manager",
        status: "active",
      },
      { onConflict: "product_id,user_id" },
    )
    .select("role,status")
    .single();

  if (error) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not assign product manager.",
    );
  }

  return data as ProductUserRow;
}

export async function promoteExistingProductUserToManager(
  productId: string,
  userId: string,
): Promise<ProductUserRow> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("product_users")
    .update({ role: "manager", status: "active" })
    .eq("product_id", productId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("role,status")
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "internal_error",
      "Could not promote product manager.",
    );
  }

  if (!data) {
    throw new ApiError(
      404,
      "not_found",
      "Target user is not an active product user.",
    );
  }

  return data as ProductUserRow;
}
```

### Task 2: Preserve platform-admin assignment

**Files:**
- Modify: `supabase/functions/admin-promote-manager/index.ts`

- [ ] Change the import and call:

```ts
import {
  assignProductManagerByPlatformAdmin,
  readJsonBody,
  requirePlatformAdmin,
  requireProductContext,
} from "../_shared/context.ts";
```

```ts
const productUser = await assignProductManagerByPlatformAdmin(
  ctx.product.id,
  body.user_id,
);
```

### Task 3: Restrict manager promotion

**Files:**
- Modify: `supabase/functions/manager-promote-manager/index.ts`

- [ ] Change the import and call:

```ts
import {
  promoteExistingProductUserToManager,
  readJsonBody,
  requireProductContext,
  requireProductManager,
} from "../_shared/context.ts";
```

```ts
const productUser = await promoteExistingProductUserToManager(
  ctx.product.id,
  body.user_id,
);
```

- [ ] Keep the existing request/response shape:

```json
{ "data": { "product_key": "eden", "user_id": "<target-auth-user-uuid>", "role": "manager" }, "error": null }
```

## Verification

- Run: `npm run lint`
  - Expected: pass with no unresolved imports after helper rename.

- Run: `npm run build`
  - Expected: pass. Existing Vite chunk-size warning is acceptable.

- Run: `rtk supabase db lint`
  - Expected: no fatal findings.

- Optional Edge Function smoke with local JWTs:
  - `manager-promote-manager` with a target auth user who has no `product_users` row should return 404 `not_found`.
  - `manager-promote-manager` with a target active `product_users` row should return role `manager`.
  - `admin-promote-manager` with a platform-admin JWT should still upsert/assign a manager row for bootstrap.

## Acceptance Criteria Covered

- Managers can promote other Product Users within the same Product.
- Platform Admin can assign managers for bootstrap.
- Managers cannot associate arbitrary global auth users with a product.

## Risks And Rollback

- If platform-admin assignment accidentally switches to update-only, first-manager bootstrap can break. Verify admin and manager paths separately.
- Rollback by restoring the single helper only if follow-up verification blocks and no implementation path depends on this split.

## Non-Goals

- Product creation UI.
- Manager demotion or last-manager changes.
- Platform-admin content-management capabilities.

## Type And Name Consistency

Use `Product User` for existing product access rows. Do not call this flow owner assignment or service-role promotion.
