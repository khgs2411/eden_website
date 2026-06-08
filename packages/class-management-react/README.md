# Class Management React Package

Private local workspace package for class-management Consumer Websites. It provides a Headless Core, ready-made Workflow Components, and a UI Primitive Adapter for React sites that already use Tailwind and ShadCN-compatible primitives.

This package is not published. Consume it through the repository workspace as `@eden/class-management-react`.

## Assumptions

- React and React DOM are provided by the host app.
- `@supabase/supabase-js` is provided by the host app.
- Tailwind-compatible design tokens are available in the host CSS.
- The host app configures Supabase URL, publishable key, and `product_key`.
- Product workflows reach the backend through Supabase Edge Functions, not backend source imports.

## Client And Provider

```tsx
import { ProductProvider, createClassManagementClient } from "@eden/class-management-react";

const client = createClassManagementClient({
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
	supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
	productKey: import.meta.env.VITE_PRODUCT_KEY ?? "eden",
});

export function App() {
	return <ProductProvider client={client}>{/* workflow components */}</ProductProvider>;
}
```

`createClassManagementClient()` returns `null` when Supabase URL or publishable key is missing. `ProductProvider` surfaces that configuration error through `useProductContext()`.

## Headless Core Exports

- `createClassManagementClient`
- `hasClassManagementClientConfig`
- `ProductProvider`
- `useProductContext`
- `invokeProductFunction`
- user API helpers from `client/product-api`
- manager API helpers from `manager/manager-api`
- shared response and domain types from `types`

## Workflow Component Exports

User-facing components:

- `AuthPanel`
- `RegistrationStatus`
- `ClassDetail`
- `ClassList`
- `UserDashboard`

Manager components:

- `TemplateEditor`
- `ScheduleEditor`
- `GeneratedClassList`
- `PendingRegistrations`
- `MembershipTypes`
- `MembershipGrants`
- `TrialAttendeeForm`
- `AttendanceSession`
- `ManagerClassDashboard`
- `ManagerOperationsDashboard`

## UI Primitive Adapter

The package exports `ClassManagementUiProvider`, `useClassManagementUi`, and `defaultClassManagementUiAdapter`.

The adapter currently supports:

- `Button`
- `Input`
- `Textarea`
- `Label`

Consumer Websites can pass a partial adapter to map these primitives to their own ShadCN-style components:

```tsx
import { ClassManagementUiProvider } from "@eden/class-management-react";

<ClassManagementUiProvider adapter={{ Button, Input, Textarea, Label }}>
	<ProductProvider client={client}>{children}</ProductProvider>
</ClassManagementUiProvider>;
```

## Boundary Rules

- Do not import Eden app internals from this package.
- Do not import `backend/` files from this package or from Consumer Websites.
- Browser product workflows may use Supabase Auth and `supabase.functions.invoke()`.
- Browser product workflows should not call product tables with `supabase.from()` or product RPCs with `supabase.rpc()`.
- Keep Consumer Website copy, layout, and visual branding in the host app.

## Build

From the repository root:

```bash
npm run build:package
```

The package-local script is:

```bash
npm run build -w packages/class-management-react
```
