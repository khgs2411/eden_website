# Chunk 06: UI Primitive Adapter And Defaults

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `05-headless-core-extraction.md`
**Enables:** `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md`

## Goal

Define the package-level UI Primitive Adapter and default ShadCN-compatible primitives so Workflow Components can be reusable without importing Eden's local UI files.

## Source Artifacts

- Spec sections: Styling Model, Reusable Frontend Package Design.
- Agenda decisions: Q5.
- Context terms: **UI Primitive Adapter**, **Workflow Component**.
- Code paths: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/textarea.tsx`, `src/lib/utils.ts`.

## Relationships

- **Depends on:** Headless Core exports exist.
- **Enables:** package Workflow Components.
- **Shared contracts:** package components consume primitives through context, not direct Eden imports.
- **Integration points:** React context, className props, ShadCN-compatible component signatures.

## File Responsibility Map

**Create:**
- `packages/class-management-react/src/ui/ui-adapter.tsx` - adapter types, default primitives, provider, and hook.
- `packages/class-management-react/src/ui/classnames.ts` - tiny `cn` helper if package cannot import Eden's `src/lib/utils.ts`.

**Modify:**
- `packages/class-management-react/src/index.ts` - export UI adapter.
- `apps/class-management-playground/src/App.tsx` - optionally wrap placeholder with `ClassManagementUiProvider`.

**Test:**
- Package build.
- Playground build.
- Root lint/build.

## Implementation Tasks

### Task 1: Add package className helper

- [ ] Create `packages/class-management-react/src/ui/classnames.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] Add `clsx` and `tailwind-merge` to `packages/class-management-react/package.json` dependencies if not already available through workspace hoisting:

```json
"dependencies": {
  "clsx": "^2.1.1",
  "lucide-react": "^1.16.0",
  "tailwind-merge": "^3.6.0"
}
```

### Task 2: Define UI Primitive Adapter

- [ ] Create `packages/class-management-react/src/ui/ui-adapter.tsx`:

```tsx
import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { cn } from "./classnames";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
};

export type InputProps = ComponentPropsWithoutRef<"input">;
export type TextareaProps = ComponentPropsWithoutRef<"textarea">;
export type LabelProps = ComponentPropsWithoutRef<"label">;

export type ClassManagementUiAdapter = {
  Button: React.ComponentType<ButtonProps>;
  Input: React.ComponentType<InputProps>;
  Textarea: React.ComponentType<TextareaProps>;
  Label: React.ComponentType<LabelProps>;
};

const DefaultButton = forwardRef<ElementRef<"button">, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
      variant === "default" && "bg-primary text-primary-foreground",
      variant === "outline" && "bg-background text-foreground",
      variant === "ghost" && "border-transparent bg-transparent text-foreground",
      size === "sm" && "px-3 py-1.5 text-xs",
      size === "icon" && "size-9 p-0",
      className
    )}
    {...props}
  />
));
DefaultButton.displayName = "DefaultButton";

const DefaultInput = forwardRef<ElementRef<"input">, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-10 rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props} />
));
DefaultInput.displayName = "DefaultInput";

const DefaultTextarea = forwardRef<ElementRef<"textarea">, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props} />
));
DefaultTextarea.displayName = "DefaultTextarea";

const DefaultLabel = forwardRef<ElementRef<"label">, LabelProps>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium", className)} {...props} />
));
DefaultLabel.displayName = "DefaultLabel";

export const defaultClassManagementUiAdapter: ClassManagementUiAdapter = {
  Button: DefaultButton,
  Input: DefaultInput,
  Textarea: DefaultTextarea,
  Label: DefaultLabel
};

const ClassManagementUiContext = createContext<ClassManagementUiAdapter>(defaultClassManagementUiAdapter);

export function ClassManagementUiProvider({ adapter, children }: { adapter?: Partial<ClassManagementUiAdapter>; children: ReactNode }) {
  return (
    <ClassManagementUiContext.Provider value={{ ...defaultClassManagementUiAdapter, ...adapter }}>
      {children}
    </ClassManagementUiContext.Provider>
  );
}

export function useClassManagementUi() {
  return useContext(ClassManagementUiContext);
}
```

### Task 3: Export adapter

- [ ] Add to `packages/class-management-react/src/index.ts`:

```ts
export * from "./ui/ui-adapter";
export * from "./ui/classnames";
```

### Task 4: Verify

- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

The package builds and exports adapter symbols. No package file imports `src/components/ui/**`.

## Acceptance Criteria Covered

- UI Primitive Adapter exists.
- Package has defaults for local use.
- Workflow Components can avoid Eden UI imports.

## Risks And Rollback

- Default primitive styling is intentionally basic. Eden-specific styling belongs to adapters/consumers.
- Roll back by removing `src/ui/**` and exports.

## Non-Goals

- Creating all workflow components.
- Matching Eden visual design.
- Adding Dialog/Select/Tabs before a workflow requires them.

## Type And Name Consistency

Use `ClassManagementUiAdapter`, `ClassManagementUiProvider`, `useClassManagementUi`, and `defaultClassManagementUiAdapter`.
