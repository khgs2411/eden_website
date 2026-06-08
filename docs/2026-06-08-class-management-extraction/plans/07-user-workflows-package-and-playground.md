# Chunk 07: User Workflows Package And Playground

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md`
**Enables:** `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md`, `10-playground-validation-and-hardening.md`

## Goal

Extract user-facing auth, class listing, class detail, registration status, registration, and cancellation workflows into package Workflow Components and wire them into the Class Management Playground.

## Source Artifacts

- Spec sections: Reusable Frontend Package Design, Standalone Mini App.
- Context terms: **Workflow Component**, **Class Management Playground**.
- Code paths: `src/components/product/auth-panel.tsx`, `src/components/product/user/class-list.tsx`, `src/components/product/user/class-detail.tsx`, `src/components/product/user/registration-status.tsx`, `src/lib/product-context.tsx`.

## Relationships

- **Depends on:** Headless Core and UI adapter.
- **Enables:** playground user validation and manager workflow context.
- **Shared contracts:** product context provider, `listUserClasses`, `registerForClass`, `cancelClassRegistration`.
- **Integration points:** package UI adapter, playground env config.

## File Responsibility Map

**Create:**
- `packages/class-management-react/src/components/auth-panel.tsx` - reusable sign-in/out panel.
- `packages/class-management-react/src/components/user/registration-status.tsx` - status display.
- `packages/class-management-react/src/components/user/class-detail.tsx` - selected class detail and registration actions.
- `packages/class-management-react/src/components/user/class-list.tsx` - class loading/list/detail composition.
- `packages/class-management-react/src/components/user/user-dashboard.tsx` - assembled user workflow.
- `apps/class-management-playground/src/class-management-client.ts` - playground client config.

**Modify:**
- `packages/class-management-react/src/index.ts` - export user components.
- `apps/class-management-playground/src/App.tsx` - render provider and user dashboard.

**Test:**
- Package build.
- Playground build.
- Manual browser smoke where possible.

## Implementation Tasks

### Task 1: Create playground client config

- [ ] Create `apps/class-management-playground/src/class-management-client.ts`:

```ts
import { createClassManagementClient } from "@eden/class-management-react";

export const classManagementClient = createClassManagementClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  productKey: import.meta.env.VITE_PRODUCT_KEY || "eden",
  authStorageKey: "class-management-playground-auth"
});
```

### Task 2: Move user components into package

- [ ] Create package components by copying current behavior from `src/components/product/**` and replacing imports:
  - `@/components/ui/*` -> `useClassManagementUi()`
  - `@/lib/product-context-state` -> package `useProductContext`
  - `@/lib/product-api` -> package API functions with client from context or prop
- [ ] Components should accept text labels through optional props when current text comes from `i18n`.
- [ ] Use default English labels in the package; Eden-specific translations are handled during Eden reintegration.

Required exported component signatures:

```ts
export type AuthPanelLabels = {
  email?: string;
  password?: string;
  signIn?: string;
  signingIn?: string;
  signedIn?: string;
  signOut?: string;
  refresh?: string;
};

export function AuthPanel(props: { labels?: AuthPanelLabels }): JSX.Element;
export function ClassList(): JSX.Element;
export function UserDashboard(): JSX.Element;
```

### Task 3: Add provider composition to playground

- [ ] Replace `apps/class-management-playground/src/App.tsx`:

```tsx
import { ClassManagementUiProvider, ProductProvider, UserDashboard } from "@eden/class-management-react";
import { classManagementClient } from "./class-management-client";

export function App() {
  return (
    <ClassManagementUiProvider>
      <ProductProvider client={classManagementClient}>
        <main className="min-h-screen bg-background p-6 text-foreground">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold">Class Management Playground</h1>
            <UserDashboard />
          </div>
        </main>
      </ProductProvider>
    </ClassManagementUiProvider>
  );
}
```

### Task 4: Export user workflows

- [ ] Add package exports:

```ts
export * from "./components/auth-panel";
export * from "./components/user/registration-status";
export * from "./components/user/class-detail";
export * from "./components/user/class-list";
export * from "./components/user/user-dashboard";
```

### Task 5: Verify

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

- Package and playground build.
- Playground can render user dashboard.
- Product calls still go through Edge Functions only.

## Acceptance Criteria Covered

- User workflows are package Workflow Components.
- Playground is first package consumer.
- Reusable components avoid Eden imports.

## Risks And Rollback

- Removing i18n from package components may change displayed text in playground only; Eden translations are restored in Eden reintegration.
- Roll back by removing package user components and restoring playground placeholder.

## Non-Goals

- Manager workflows.
- Eden reintegration.
- Full visual redesign.

## Type And Name Consistency

Use `AuthPanel`, `ClassList`, `ClassDetail`, `RegistrationStatus`, and `UserDashboard`.
