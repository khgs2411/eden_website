# Chunk 04: Workspace And Package Scaffold

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-baseline-product-smoke.md`
**Enables:** `05-headless-core-extraction.md`, `07-user-workflows-package-and-playground.md`

## Goal

Add the local workspace structure for the Reusable Frontend Package and Class Management Playground while preserving existing root commands. This chunk creates package/app boundaries without moving product behavior yet.

## Source Artifacts

- Spec sections: Proposed Repository Shape, Reusable Frontend Package Design, Standalone Mini App.
- Agenda decisions: Q2, Q4, Q9.
- ADR: `docs/adr/0004-local-workspace-frontend-package.md`.
- Code paths: `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`.

## Relationships

- **Depends on:** baseline smoke.
- **Enables:** package extraction and playground development.
- **Shared contracts:** package path `packages/class-management-react`; playground path `apps/class-management-playground`.
- **Integration points:** npm workspaces, TypeScript, Vite, ESLint.

## File Responsibility Map

**Create:**
- `packages/class-management-react/package.json` - local package manifest.
- `packages/class-management-react/src/index.ts` - temporary package export placeholder.
- `packages/class-management-react/tsconfig.json` - package TypeScript config.
- `packages/class-management-react/README.md` - package purpose and current status.
- `apps/class-management-playground/package.json` - playground app manifest.
- `apps/class-management-playground/src/main.tsx` - minimal Vite React entry.
- `apps/class-management-playground/src/App.tsx` - minimal placeholder app.
- `apps/class-management-playground/src/index.css` - Tailwind import and minimal tokens.
- `apps/class-management-playground/index.html` - Vite HTML entry.
- `apps/class-management-playground/vite.config.ts` - playground Vite config.
- `apps/class-management-playground/tsconfig.json` - playground TS config.
- `apps/class-management-playground/README.md` - playground purpose.

**Modify:**
- `package.json` - add npm workspaces and scripts while preserving existing `dev`, `build`, `lint`, `preview`.
- `tsconfig.app.json` or root TS config only if needed for workspace path aliases.
- `eslint.config.js` only if lint ignores/coverage need adjustment.

**Test:**
- Root lint/build.
- Package typecheck/build.
- Playground build.

## Implementation Tasks

### Task 1: Add npm workspaces and scripts

- [ ] Modify root `package.json` by adding:

```json
"workspaces": [
  "packages/class-management-react",
  "apps/class-management-playground"
]
```

- [ ] Preserve existing scripts and add:

```json
"build:package": "npm run build -w packages/class-management-react",
"build:playground": "npm run build -w apps/class-management-playground",
"dev:playground": "npm run dev -w apps/class-management-playground"
```

Expected existing root scripts remain: `dev`, `build`, `lint`, `preview`.

### Task 2: Create package scaffold

- [ ] Create `packages/class-management-react/package.json`:

```json
{
  "name": "@eden/class-management-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "peerDependencies": {
    "@supabase/supabase-js": "^2.106.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "dependencies": {
    "lucide-react": "^1.16.0"
  },
  "devDependencies": {}
}
```

- [ ] Create `packages/class-management-react/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "emitDeclarationOnly": false,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

- [ ] Create `packages/class-management-react/src/index.ts`:

```ts
export const classManagementPackageVersion = "0.0.0";
```

- [ ] Create `packages/class-management-react/README.md`:

```md
# Class Management React

Local workspace package for the class-management Reusable Frontend Package.
It will expose the Headless Core, Workflow Components, and UI Primitive Adapter.
```

### Task 3: Create playground scaffold

- [ ] Create `apps/class-management-playground/package.json`:

```json
{
  "name": "class-management-playground",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@eden/class-management-react": "0.0.0",
    "@supabase/supabase-js": "^2.106.1",
    "@vitejs/plugin-react": "^6.0.1",
    "vite": "^8.0.12",
    "typescript": "~6.0.2",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "tailwindcss": "^4.3.0",
    "@tailwindcss/vite": "^4.3.0",
    "lucide-react": "^1.16.0"
  },
  "devDependencies": {}
}
```

- [ ] Create `apps/class-management-playground/src/App.tsx`:

```tsx
import { classManagementPackageVersion } from "@eden/class-management-react";

export function App() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <h1 className="text-2xl font-bold">Class Management Playground</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Package version: {classManagementPackageVersion}
      </p>
    </main>
  );
}
```

- [ ] Create `apps/class-management-playground/src/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] Create `apps/class-management-playground/src/index.css`:

```css
@import "tailwindcss";

:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.16 0 0);
  --muted-foreground: oklch(0.45 0 0);
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--background);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
}
```

- [ ] Create `apps/class-management-playground/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Class Management Playground</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] Create `apps/class-management-playground/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()]
});
```

- [ ] Create `apps/class-management-playground/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

### Task 4: Install workspace metadata and verify

- [ ] Run: `rtk npm install`
  - Expected: `package-lock.json` updates with workspace packages.
- [ ] Run: `rtk npm run build:package`
  - Expected: exits 0 and creates `packages/class-management-react/dist/`.
- [ ] Run: `rtk npm run build:playground`
  - Expected: exits 0 and creates `apps/class-management-playground/dist/`.
- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0; existing Vite chunk-size warning is acceptable.

## Verification

- Workspace install succeeds.
- Root `npm run lint` and `npm run build` still pass.
- `npm run build:package` and `npm run build:playground` pass.

## Acceptance Criteria Covered

- Local workspace package first.
- Playground path exists.
- Root commands remain usable.

## Risks And Rollback

- npm workspace lockfile churn is expected; review `package-lock.json`.
- Roll back by removing workspace entries and deleting `packages/class-management-react` and `apps/class-management-playground`.

## Non-Goals

- Moving product behavior.
- Building real package UI.
- Connecting playground to Supabase.

## Type And Name Consistency

Use package name `@eden/class-management-react` and app path `apps/class-management-playground`.
