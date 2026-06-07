# Chunk 09: Frontend Product Auth Shell

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `02-edge-api-foundation.md`
**Enables:** `10-frontend-user-classes-registration.md`, `11-frontend-manager-class-operations.md`, `12-frontend-manager-membership-attendance.md`

## Goal

Build the playground frontend shell for the product API: product context, auth/session state, role-aware navigation, Edge Function client wrapper, loading/error states, and protected manager/user routes without implementing domain workflows.

## Source Artifacts

- Root spec: Edge-Function-only frontend API, product key/origin behavior.
- Context: Product, Product Key, Product User, Manager, User.
- Code paths: `src/lib/supabase.ts`, `src/App.tsx`, `src/components/layout/*`, `src/i18n.ts`.

## Relationships

- **Depends on:** Edge Function product-context API.
- **Enables:** all frontend workflow chunks.
- **Shared contracts:** product key config, session context, product role context, `invokeProductFunction`.
- **Integration points:** Vite env vars, Supabase browser client, existing layout.

## Frontend Contract

`ProductContextValue` must expose:

```ts
type ProductContextValue = {
  productKey: string;
  product: { product_key: string; name: string } | null;
  productUser: { role: "manager" | "user"; status: "active" | "inactive" } | null;
  loading: boolean;
  error: string | null;
  refreshProductContext: () => Promise<void>;
};
```

The Edge Function wrapper must return the shared `ApiResponse<T>` envelope from Chunk 02.

## File Responsibility Map

**Create:**
- `src/lib/product-api.ts` - Edge Function invocation wrapper.
- `src/lib/product-context.tsx` - React provider for product/session/role state.
- `src/components/product/product-shell.tsx` - role-aware product area.
- `src/components/product/auth-panel.tsx` - login/logout/session controls.

**Modify:**
- `src/lib/supabase.ts` - preserve nullable client and export helpers needed by provider.
- `src/App.tsx` - add product shell entry point without deleting existing landing sections.
- `src/i18n.ts` - add minimal product shell copy.

**Test:**
- `npm run lint`, `npm run build`.

## Implementation Tasks

### Task 1: Add product API wrapper

- [ ] Create a wrapper that calls `supabase.functions.invoke()` only when Supabase client is configured.
- [ ] Always include `product_key` from `VITE_PRODUCT_KEY` or a local default `eden`.
- [ ] Return typed success/error envelopes matching Chunk 02.

### Task 2: Add product context provider

- [ ] Load auth session.
- [ ] Call `product-context` Edge Function when session/origin/product key changes.
- [ ] Expose product, productUserRole, loading, error, signIn, signOut.
- [ ] Do not read tables directly.

### Task 3: Add role-aware shell

- [ ] Add user and manager navigation placeholders.
- [ ] Manager routes are visible only when role is `manager`.
- [ ] Existing marketing page remains available.
- [ ] No template/class/membership workflows are implemented here.

## Verification

- Run: `npm run lint`
  - Expected: no lint errors.
- Run: `npm run build`
  - Expected: TypeScript and Vite build pass.
- Manual smoke:
  - With missing Supabase env vars, app renders without crashing and shows configuration error.
  - With env vars, product context loads through Edge Function.

## Acceptance Criteria Covered

- Frontend uses Edge Functions, not direct DB access.
- Product key-aware playground shell exists.
- Role-aware manager/user UI boundary exists.

## Risks And Rollback

- Frontend shell can disrupt existing landing page. Keep product UI isolated and reversible.
- Rollback by removing product shell wiring from `App.tsx` and new product files.

## Non-Goals

- Class listing/registration.
- Manager CRUD workflows.
- Membership and attendance UI.

## Type And Name Consistency

Use `Product User` role values `manager` and `user`. Do not use `admin` for manager UI.
