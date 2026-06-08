# Chunk 05: Headless Core Extraction

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `04-workspace-and-package-scaffold.md`
**Enables:** `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md`

## Goal

Extract the non-visual class-management frontend layer into `packages/class-management-react`: Supabase client construction, product API invocation, product auth/context provider, domain types, manager API helpers, and public package exports. Eden and the playground should consume this package layer instead of duplicating product API logic.

## Source Artifacts

- Spec sections: Reusable Frontend Package Design, API Boundary.
- Agenda decisions: Q2, Q3, Q4, Q8.
- Context terms: **Reusable Frontend Package**, **Headless Core**, **Consumer Website**.
- ADR: `docs/adr/0004-local-workspace-frontend-package.md`.
- Code paths: `src/lib/supabase.ts`, `src/lib/product-api.ts`, `src/lib/product-context.tsx`, `src/lib/product-context-state.ts`, `src/components/product/manager/manager-api.ts`.

## Relationships

- **Depends on:** workspace package exists and builds.
- **Enables:** UI adapter and Workflow Components.
- **Shared contracts:** `product_key`, `ApiResponse<T>`, Edge Function invocation, Supabase Auth state.
- **Integration points:** `@supabase/supabase-js`, React context, package exports.

## File Responsibility Map

**Create:**
- `packages/class-management-react/src/client/supabase.ts` - create configured Supabase client from host config.
- `packages/class-management-react/src/client/product-api.ts` - Edge Function invocation and user API helpers.
- `packages/class-management-react/src/context/product-context-state.ts` - context type and hook.
- `packages/class-management-react/src/context/product-provider.tsx` - provider and auth actions.
- `packages/class-management-react/src/manager/manager-api.ts` - manager domain types and `callManagerApi`.
- `packages/class-management-react/src/types.ts` - shared public types if splitting from API files is cleaner.
- `packages/class-management-react/src/index.ts` - public exports.

**Modify:**
- `src/lib/supabase.ts` - either keep as Eden wrapper or replace exports from package.
- `src/lib/product-api.ts`, `src/lib/product-context.tsx`, `src/lib/product-context-state.ts`, `src/components/product/manager/manager-api.ts` - convert to compatibility re-exports or remove imports after dependent chunks.
- `apps/class-management-playground/src/App.tsx` - import one Headless Core export to prove package consumption.

**Test:**
- Package build/typecheck.
- Root lint/build.
- Playground build.

## Implementation Tasks

### Task 1: Add package Supabase client factory

- [ ] Create `packages/class-management-react/src/client/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ClassManagementClientConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  productKey: string;
  authStorageKey?: string;
};

export type ClassManagementClient = {
  supabase: SupabaseClient;
  productKey: string;
};

export function createClassManagementClient(config: ClassManagementClientConfig): ClassManagementClient {
  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      storageKey: config.authStorageKey ?? `class-management-${config.productKey}-auth`
    }
  });

  return {
    supabase,
    productKey: config.productKey
  };
}
```

### Task 2: Move product API types and invocation

- [ ] Create `packages/class-management-react/src/client/product-api.ts` using the current `src/lib/product-api.ts` behavior, changed to accept `ClassManagementClient` instead of importing Eden globals:

```ts
import type { ClassManagementClient } from "./supabase";

export type ApiErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal_error";

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: ApiErrorCode; message: string } };

export type ProductRole = "manager" | "user";
export type ProductUserStatus = "active" | "inactive";
export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ClassVisibility = "public" | "hidden" | "members_only";
export type RegistrationPolicy = "auto_approve" | "member_auto_approve" | "approval_required";
export type MembershipRequirement = "none" | "required";

export type ProductSummary = { product_key: string; name: string };
export type ProductUserSummary = { role: ProductRole; status: ProductUserStatus };
export type ProductContextResponse = { product: ProductSummary; product_user: ProductUserSummary | null };

export type UserClassSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  capacity: number;
  approved_count?: number;
  visibility: ClassVisibility;
  registration_policy: RegistrationPolicy;
  membership_requirement: MembershipRequirement;
  user_registration: { id: string; status: RegistrationStatus } | null;
};

export type UserClassesResponse = { classes: UserClassSummary[] };

export type ClassRegistrationResponse = {
  registration_id: string;
  status: RegistrationStatus;
  stock_consumed: number;
  registration: { id: string; class_id: string; status: RegistrationStatus };
};

export async function invokeProductFunction<T>(
  client: ClassManagementClient,
  functionName: string,
  body: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  const { data, error } = await client.supabase.functions.invoke<ApiResponse<T>>(functionName, {
    body: {
      ...body,
      product_key: body.product_key ?? client.productKey
    }
  });

  if (error) {
    return { data: null, error: { code: "internal_error", message: error.message } };
  }

  if (!data) {
    return { data: null, error: { code: "internal_error", message: "Empty response from product API." } };
  }

  return data;
}

export function listUserClasses(client: ClassManagementClient, isSignedIn: boolean) {
  return invokeProductFunction<UserClassesResponse>(client, "classes", {
    action: isSignedIn ? "list_user" : "list_public"
  });
}

export function registerForClass(client: ClassManagementClient, classId: string) {
  return invokeProductFunction<ClassRegistrationResponse>(client, "register-class", {
    action: "register",
    class_id: classId
  });
}

export function cancelClassRegistration(client: ClassManagementClient, registrationId: string) {
  return invokeProductFunction<ClassRegistrationResponse>(client, "register-class", {
    action: "cancel",
    registration_id: registrationId
  });
}
```

### Task 3: Move product context/provider

- [ ] Create `packages/class-management-react/src/context/product-context-state.ts` with current context shape plus client-aware types:

```ts
import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ProductSummary, ProductUserSummary } from "../client/product-api";
import type { ClassManagementClient } from "../client/supabase";

export type ProductContextValue = {
  client: ClassManagementClient;
  productKey: string;
  product: ProductSummary | null;
  productUser: ProductUserSummary | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  refreshProductContext: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const ProductContext = createContext<ProductContextValue | null>(null);

export function useProductContext() {
  const value = useContext(ProductContext);
  if (!value) throw new Error("useProductContext must be used inside ProductProvider.");
  return value;
}

export function useClassManagementClient() {
  return useProductContext().client;
}
```

- [ ] Create `packages/class-management-react/src/context/product-provider.tsx` by adapting current `src/lib/product-context.tsx` to accept `client: ClassManagementClient` as a prop and use `invokeProductFunction(client, ...)`.
- [ ] Include the passed `client` in `ProductContextValue` so Workflow Components can call package API helpers without importing Consumer Website globals.
- [ ] Preserve stale refresh-token recovery:

```ts
function isStaleRefreshTokenError(error: Error) {
  return error.message.toLowerCase().includes("refresh token");
}
```

### Task 4: Move manager types/API helper

- [ ] Create `packages/class-management-react/src/manager/manager-api.ts` by moving current type definitions from `src/components/product/manager/manager-api.ts`.
- [ ] Change `callManagerApi` signature to accept the client:

```ts
import type { ClassManagementClient } from "../client/supabase";
import { invokeProductFunction } from "../client/product-api";

export async function callManagerApi<T>(client: ClassManagementClient, functionName: string, body: Record<string, unknown>) {
  const response = await invokeProductFunction<T>(client, functionName, body);
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
}
```

### Task 5: Export Headless Core

- [ ] Replace `packages/class-management-react/src/index.ts`:

```ts
export * from "./client/supabase";
export * from "./client/product-api";
export * from "./context/product-context-state";
export * from "./context/product-provider";
export * from "./manager/manager-api";
```

### Task 6: Add Eden compatibility wrappers

- [ ] Keep `src/lib/product-api.ts` as an Eden compatibility module until component extraction completes. It should create a client from env and delegate to package functions.
- [ ] Keep `src/lib/product-context.tsx` and `src/lib/product-context-state.ts` as re-exports or thin wrappers so current product files still compile until they move.

### Task 7: Verify

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

All commands in Task 7 pass. Frontend searches still show no `supabase.from()` or `supabase.rpc()` under package or `src`.

## Acceptance Criteria Covered

- Package exposes Headless Core.
- Consumer frontend remains Supabase Auth plus Edge Functions.
- Eden can later consume package without backend imports.

## Risks And Rollback

- Duplicated compatibility wrappers can drift. Later chunks should remove old wrappers when no longer imported.
- Roll back by reverting package Headless Core files and restoring original `src/lib/**` files.

## Non-Goals

- Moving visual components.
- Creating UI Primitive Adapter.
- Changing Edge Function contracts.

## Type And Name Consistency

Export names: `createClassManagementClient`, `invokeProductFunction`, `ProductProvider`, `useProductContext`, `callManagerApi`.
