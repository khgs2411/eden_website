# Chunk 02: Edge API Foundation

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-product-role-foundation.md`
**Enables:** All frontend-facing product APIs

## Goal

Create the reusable Edge Function API shell that every frontend product will call: CORS, product key/origin validation, JWT user loading, role checks, consistent errors, and bootstrap flows for product context and manager promotion.

## Source Artifacts

- Root spec: Technical Design Direction, Permissions / Security.
- Root agenda: canonical API boundary and product bootstrap decisions.
- ADR 0001.
- Code paths: `supabase/config.toml`, `src/lib/supabase.ts`.

## Relationships

- **Depends on:** product tables, role helpers, allowed origin rows from Chunk 01.
- **Enables:** manager/user APIs in chunks 03-08 and frontend shell in chunk 09.
- **Shared contracts:** Edge Function request envelope, response envelope, auth/product context object, role guard helpers.
- **Integration points:** Supabase Edge Runtime Deno 2, browser Supabase client auth session.

## API Contract

All product Edge Functions use this envelope:

```json
{ "data": {}, "error": null }
```

Error envelope:

```json
{ "data": null, "error": { "code": "forbidden", "message": "Human readable message" } }
```

All requests include `product_key` in the JSON body unless the endpoint is explicitly platform-only. All mutating requests require `Authorization: Bearer <jwt>` and a valid `Origin` header matching `product_allowed_origins`.

## File Responsibility Map

**Create:**
- `supabase/functions/_shared/cors.ts` - CORS and origin extraction.
- `supabase/functions/_shared/errors.ts` - API error helpers.
- `supabase/functions/_shared/context.ts` - product/JWT/role validation helpers.
- `supabase/functions/product-context/index.ts` - resolve current product/user context.
- `supabase/functions/admin-promote-manager/index.ts` - platform-admin manager promotion.
- `supabase/functions/manager-promote-manager/index.ts` - product-manager manager promotion.

**Modify:**
- `src/lib/supabase.ts` - expose a small invoke helper only if useful for frontend chunks.

**Test:**
- Edge Function smoke calls with `curl` or `supabase functions serve`.

## Implementation Tasks

### Task 1: Create shared Edge Function utilities

- [ ] Run `supabase functions new product-context`, `supabase functions new admin-promote-manager`, and `supabase functions new manager-promote-manager`.
- [ ] Create shared modules under `supabase/functions/_shared/`.
- [ ] Implement helpers with these TypeScript signatures:

```ts
export type ApiErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal_error";

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: ApiErrorCode; message: string } };

export type ProductRequestContext = {
  req: Request;
  origin: string;
  product: { id: string; product_key: string; name: string };
  user: { id: string; email?: string };
  productUser: { role: "manager" | "user"; status: "active" | "inactive" } | null;
};

export async function requireProductContext(req: Request, body: { product_key?: string }): Promise<ProductRequestContext>;
export async function requireProductManager(ctx: ProductRequestContext): Promise<void>;
export async function requirePlatformAdmin(ctx: ProductRequestContext): Promise<void>;
export function jsonOk<T>(data: T, init?: ResponseInit): Response;
export function jsonError(status: number, code: ApiErrorCode, message: string): Response;
```

### Task 2: Implement product context resolution

- [ ] `product-context` accepts:

```json
{ "product_key": "eden" }
```

- [ ] Success response for anonymous callers:

```json
{ "data": { "product": { "product_key": "eden", "name": "Eden Dance" }, "product_user": null }, "error": null }
```

- [ ] Success response for authenticated callers creates/confirms `product_users` role `user` and returns:

```json
{ "data": { "product": { "product_key": "eden", "name": "Eden Dance" }, "product_user": { "role": "user", "status": "active" } }, "error": null }
```

### Task 3: Implement manager promotion flows

- [ ] `admin-promote-manager` and `manager-promote-manager` accept:

```json
{ "product_key": "eden", "user_id": "<target-auth-user-uuid>" }
```

- [ ] Success response:

```json
{ "data": { "product_key": "eden", "user_id": "<target-auth-user-uuid>", "role": "manager" }, "error": null }
```
- [ ] Both functions must preserve last-manager invariants from Chunk 01.

### Task 4: Align browser helper

- [ ] If `src/lib/supabase.ts` is modified, keep the existing nullable client behavior and add an `invokeProductFunction` helper that always passes `product_key` in the body or headers.
- [ ] Do not introduce direct table access for product APIs.

## Verification

- Run: `rtk supabase status`
  - Expected: local stack running.
- Run: `supabase functions serve`
  - Expected: functions serve locally without TypeScript/Deno import errors.
- Run: unauthenticated `curl` to `product-context`:

```bash
curl -i \
  -H 'Origin: http://localhost:5173' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden"}' \
  http://127.0.0.1:54321/functions/v1/product-context
```

  - Expected: product metadata only or an explicit auth-required error for protected fields.
- Run: invalid origin call:

```bash
curl -i \
  -H 'Origin: http://evil.localhost' \
  -H 'Content-Type: application/json' \
  -d '{"product_key":"eden"}' \
  http://127.0.0.1:54321/functions/v1/product-context
```

  - Expected: 403.
- Run: `npm run build`
  - Expected: Vite/TypeScript build passes if frontend helper changed.

## Acceptance Criteria Covered

- Frontends call Edge Functions only.
- Product key spoofing is not enough to mutate another product.
- Platform admin can assign managers; managers can promote managers in-product.
- Service role stays server-side only.

## Risks And Rollback

- CORS/origin logic can block local dev; seed localhost origins and verify.
- If shared helpers break all functions, rollback by reverting this chunk's function files.

## Non-Goals

- Domain object APIs beyond product context and manager promotion.
- Frontend auth UI.

## Type And Name Consistency

Use `product_key`, `product_id`, `Product User`, `Platform Admin`, and `Manager` consistently with Chunk 01.
