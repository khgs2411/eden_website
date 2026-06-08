# Chunk 11: Eden Reintegration

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `10-playground-validation-and-hardening.md`, `03-remove-embedded-eden-product-ui.md`
**Enables:** `12-final-docs-and-handoff.md`

## Goal

Reintroduce class management into Eden through `packages/class-management-react` only, with Eden-specific composition and styling. The final behavior should match the validated package/backend product behavior while avoiding the old embedded bottom-of-page implementation.

## Source Artifacts

- Spec sections: Eden Reintegration, Reusable Frontend Package Design, Acceptance Criteria.
- Agenda decisions: Q5, Q6, Q7, Q8.
- Code paths: `src/App.tsx`, `src/components/sections/**`, `src/components/layout/**`, `src/i18n.ts`, `src/index.css`, `docs/design-guide.md`, `packages/class-management-react/**`.

## Relationships

- **Depends on:** playground validation and removal of the old embedded UI.
- **Enables:** final docs and handoff.
- **Shared contracts:** package exports, Supabase Auth, Edge Functions, `product_key=eden`.
- **Integration points:** Eden layout, i18n/theme, package provider, package UI adapter.

## File Responsibility Map

**Create:**
- `src/components/sections/class-management-section.tsx` or a similarly local Eden section file matching existing section naming.
- Optional: `src/components/class-management/eden-class-management.tsx` if the integration needs a small composition boundary.

**Modify:**
- `src/App.tsx` - mount the new Eden class-management composition in the intended page location.
- `src/i18n.ts` - add Eden-specific translated labels if visible site copy is needed.
- `src/index.css` - add only small package-host styling tokens or class hooks if necessary.
- `src/components/layout/header.tsx` or related nav files if the section needs navigation.
- `packages/class-management-react/src/**` - only for reusable package bugs discovered during Eden integration.

**Do Not Modify:**
- `backend/**` unless a playground-validated backend bug is discovered and separately justified.
- Old `src/components/product/**` files except for deletion cleanup if they remain unused after package reintegration.

**Test:**
- Root lint/build.
- Eden manual browser check in supported languages/themes.
- Package import boundary scan.

## Implementation Tasks

### Task 1: Confirm package-only integration boundary

- [ ] Verify the playground validation checklist from chunk 10 is complete or has accepted non-blocking notes.
- [ ] Verify the old embedded product UI from chunk 03 is not mounted in Eden.
- [ ] Search Eden source before changes:
  - `rtk rg -n "components/product|lib/product|supabase/functions|supabase/migrations|supabase\\.from\\(|supabase\\.rpc\\(" src`
- [ ] Expected: no active Eden product implementation imports remain except intentional package imports added in this chunk.

### Task 2: Create Eden class-management composition

- [ ] Create an Eden-local composition component that imports from `@eden/class-management-react`.
- [ ] Configure the package client from Eden public env values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_PRODUCT_KEY` or a local constant `eden` if the repo already uses that pattern.
- [ ] Wrap package workflows with `ProductProvider`.
- [ ] Use `ClassManagementUiProvider` to pass Eden/ShadCN-compatible primitives or rely on package defaults if they already match Eden style.
- [ ] Use ready-made Workflow Components instead of copying business logic into Eden.

### Task 3: Design the Eden presentation surface

- [ ] Place the class-management product in a deliberate page section or route-like area rather than the old bottom dump.
- [ ] Match `docs/design-guide.md` and current site typography/theme conventions.
- [ ] Keep dense manager operations organized for repeated use; avoid marketing hero treatment for the management dashboard.
- [ ] Ensure the user-facing class discovery and registration state is understandable in signed-out and signed-in states.
- [ ] Preserve Hebrew, English, and Russian layout resilience where visible Eden copy is translated.

### Task 4: Add role-aware workflow composition

- [ ] Show user class discovery/registration workflows for signed-out and signed-in users.
- [ ] Show manager dashboards only when `productUser?.role === "manager"` and `productUser.status === "active"`.
- [ ] Show signed-in account controls using package auth state.
- [ ] Keep admin/global behavior limited to what the package/backend already exposes; do not add Eden-local admin logic.

### Task 5: Remove unused old frontend product code

- [ ] After the new package-based Eden integration builds, search for references to:
  - `src/components/product`
  - `src/lib/product-api.ts`
  - `src/lib/product-context.tsx`
  - `src/lib/product-context-state.ts`
- [ ] Delete old Eden product implementation files only when they are no longer imported.
- [ ] Keep shared UI primitives that are still used by the site.
- [ ] Do not delete backend files or package files.

### Task 6: Verify package boundary

- [ ] Run: `rtk rg -n "supabase\\.from\\(|supabase\\.rpc\\(" src packages/class-management-react/src apps/class-management-playground/src`
  - Expected: no product frontend table/RPC calls. Supabase Auth and `supabase.functions.invoke()` are allowed.
- [ ] Run: `rtk rg -n "backend/|supabase/functions|supabase/migrations" src packages/class-management-react/src apps/class-management-playground/src`
  - Expected: no Consumer Website imports from backend source files.
- [ ] Run: `rtk rg -n "@/components/product|@/lib/product" src`
  - Expected: no old embedded product imports.

### Task 7: Verify Eden site

- [ ] Run: `rtk npm run lint`
  - Expected: exits 0.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.
- [ ] Run the Eden site locally.
- [ ] Check the class-management surface in English, Hebrew, and Russian if the section is visible in all languages.
- [ ] Check light and dark themes.
- [ ] Sign in as `eden@manager.local`.
  - Expected: package-based manager workflows are visible and load against the backend.
- [ ] Sign out.
  - Expected: session clears without stale refresh-token console errors.

## Verification

Eden imports and composes the reusable package, not old product internals. The final site builds and the class-management surface works against the extracted backend through Supabase Auth and Edge Functions.

## Acceptance Criteria Covered

- Eden becomes a Consumer Website.
- Old embedded bottom-of-page UI is replaced by a new package-based composition.
- Product behavior remains package/backend-owned.
- No frontend product source imports backend files.

## Risks And Rollback

- Eden styling may expose package assumptions that the playground did not. Fix reusable assumptions in the package, not by forking Eden-only product logic.
- Roll back by removing the Eden composition mount and restoring the post-chunk-03 site state.

## Non-Goals

- Publishing the package.
- Moving the Supabase Project out of the repo.
- Adding new class-management features beyond the validated package behavior.

## Type And Name Consistency

Use **Eden Consumer Website** for this integration and keep package imports from `@eden/class-management-react`.
