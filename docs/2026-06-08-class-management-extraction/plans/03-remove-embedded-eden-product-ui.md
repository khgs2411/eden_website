# Chunk 03: Remove Embedded Eden Product UI

**Plan Set:** `../plan.md`
**Spec:** `../spec.md`
**Status:** Ready For Implementation
**Depends on:** `01-baseline-product-smoke.md`
**Enables:** `11-eden-reintegration.md`

## Goal

Remove the current bottom-of-page class-management UI from Eden's landing page without deleting reusable source code that later chunks need to extract. The Eden website should remain a working landing page and Consumer Website shell with product UI temporarily absent.

## Source Artifacts

- Spec sections: Scope, Eden Reintegration, Verification Strategy.
- Agenda decisions: Q7, Q8.
- Context terms: **Consumer Website**, **Reusable Frontend Package**.
- Code paths: `src/App.tsx`, `src/components/product/**`, `src/lib/product-context.tsx`, `src/lib/product-context-state.ts`, `src/lib/product-api.ts`, `src/lib/supabase.ts`, `src/i18n.ts`.

## Relationships

- **Depends on:** baseline smoke evidence.
- **Enables:** clean Eden surface before package reintegration.
- **Shared contracts:** product source files remain available for later extraction.
- **Integration points:** Eden landing page layout, site navigation, theme, legacy signup.

## File Responsibility Map

**Modify:**
- `src/App.tsx` - remove `ProductProvider` wrapper and `<ProductShell />` from the rendered landing page.

**Keep:**
- `src/components/product/**` - keep files in place for later extraction chunks.
- `src/lib/product-*.ts*` and `src/lib/supabase.ts` - keep files in place for later extraction chunks.
- `src/i18n.ts` - keep product copy until extraction/reintegration clarifies ownership.

**Test:**
- Root lint/build.
- Manual landing-page inspection if a browser is available during execution.

## Implementation Tasks

### Task 1: Remove ProductShell from Eden render tree

- [ ] Modify `src/App.tsx` imports by removing:

```ts
import { ProductShell } from "@/components/product/product-shell";
import { ProductProvider } from "@/lib/product-context";
```

- [ ] Modify `src/App.tsx` JSX by replacing the top-level `ProductProvider` wrapper with a fragment and removing `<ProductShell />`:

```tsx
return (
  <main className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-background text-foreground shadow-[0_0_0_1px_var(--border),0_24px_80px_rgba(0,0,0,0.18)] sm:my-1 sm:rounded-[1.25rem] lg:max-w-[820px]">
    <SiteHeader drawerSide={drawerSide} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} onThemeToggle={toggleTheme} theme={theme} />
    {activeView === "voguePricing" ? (
      <VoguePricingView onBack={() => setActiveView("home")} />
    ) : (
      <>
        <div className="bg-background">
          <HeroSection theme={theme} />
          <LessonsSection onLessonSelect={handleLessonSelect} />
        </div>
        <PrivateLessonSection />
      </>
    )}
    <SiteFooter />
  </main>
);
```

If formatting differs, preserve the exact surrounding app shell and only remove the product provider/shell.

### Task 2: Confirm product files remain for extraction

- [ ] Run: `rtk rg --files src/components/product src/lib | rtk rg 'product|supabase'`
  - Expected: current product files still exist for later extraction.

### Task 3: Run checks

- [ ] Run: `rtk npm run lint`
  - Expected: exits 0 with no unused import errors.
- [ ] Run: `rtk npm run build`
  - Expected: exits 0.

## Verification

- Eden landing page builds without class-management section.
- Product source files remain present for later chunks.
- `rtk npm run lint` exits 0.
- `rtk npm run build` exits 0.

## Acceptance Criteria Covered

- Eden no longer contains the current embedded bottom-of-page product implementation.
- Landing page remains intact.
- Product behavior is not rewritten.

## Risks And Rollback

- Removing the provider may expose imports that were only used by the product UI. Lint catches this.
- Roll back by restoring `ProductProvider` wrapper and `<ProductShell />` in `src/App.tsx`.

## Non-Goals

- Deleting product components.
- Creating the new Eden design.
- Moving code into the package.

## Type And Name Consistency

Do not rename product files in this chunk. Later extraction chunks own package names.
