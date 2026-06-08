# Class Management Extraction And Reusable Frontend Design

Status: Final design. Ready for user review before implementation planning.

Date: 2026-06-08

## Goal

Extract the existing class-management implementation from this Eden website into reusable boundaries without changing the product behavior:

1. A backend-owned **Supabase Project** that behaves like a separate backend repo nested inside this repo for now.
2. A stylable/styled React frontend package that can be copied or imported into other React + ShadCN + Tailwind websites.
3. A standalone mini frontend app for developing and testing the reusable frontend against the **Supabase Project**.
4. A branded Eden implementation that consumes the reusable frontend package instead of owning product logic directly.

This phase should preserve the approved shared-Supabase architecture and the currently implemented backend behavior while making the codebase easier to reuse across future product sites. The goal is not to redesign the backend product contract. The goal is to reorganize ownership, remove the directly embedded class-management product UI from Eden, develop the reusable frontend in a standalone mini app, and only then implement a new Eden-specific UI that consumes the reusable frontend layer.

## Current Context

The current branch is `feature/classes`. The working tree already has local modifications for Supabase auth storage recovery and local seed users.

The class-management implementation currently lives in three places:

- Backend: `supabase/config.toml`, `supabase/seed.sql`, `supabase/functions/**`, and class-management migrations under `supabase/migrations/`.
- Product frontend state/API: `src/lib/supabase.ts`, `src/lib/product-api.ts`, `src/lib/product-context.tsx`, and `src/lib/product-context-state.ts`.
- Product frontend UI: `src/components/product/**`, with copy in `src/i18n.ts` and shell integration in `src/App.tsx`.

Current frontend backend access is Edge-Function-only for product workflows:

- `src/lib/product-api.ts` defines `invokeProductFunction()`, which calls `supabase.functions.invoke()`.
- User class and registration helpers call `invokeProductFunction()`.
- `src/components/product/manager/manager-api.ts` defines `callManagerApi()`, which also delegates to `invokeProductFunction()`.
- Product manager components call `callManagerApi()` for templates, schedules, generated classes, memberships, pending registrations, and attendance.
- `src/lib/product-context.tsx` calls `invokeProductFunction("product-context")` for product context.
- Direct frontend Supabase usage outside the product API wrapper is limited to auth session/sign-in/sign-out.
- Code inspection found no frontend `supabase.from()` or `supabase.rpc()` calls under `src/`.

The current product UI is functional-looking but has not been product-tested by the user. It is also visually and structurally embedded in Eden's landing page. It uses existing local ShadCN-style primitives under `src/components/ui`, Tailwind tokens, lucide icons, and i18next translations.

Existing durable architecture decisions still apply:

- One shared Supabase backend across products.
- `product_key` is the public product scope.
- Browser product workflows use Edge Functions as the product API boundary.
- RLS remains defense in depth.
- Generated classes are concrete snapshots created by rolling schedule materialization.

## Scope

This design covers extraction and reintegration boundaries. It does not redesign the underlying class, schedule, membership, registration, attendance domain model, or Edge Function contract unless extraction exposes a contradiction.

In scope:

- A backend folder boundary that owns Supabase functions, migrations, seed, config, and backend verification docs/scripts.
- A reusable frontend package boundary for product API client, auth/product context state, hooks, types, and stylable React components.
- A standalone mini application inside this repository that imports the reusable frontend package and talks to the **Supabase Project** for product testing.
- Removal of the currently embedded Eden class-management UI from the bottom of the website during extraction.
- A later branded Eden product surface that imports the reusable frontend package and supplies styling/copy/composition.
- A testing and verification sequence that protects the untested current product before and after extraction.
- A behavior-preserving replacement of the current direct Eden product UI with the newly developed reusable frontend package.

Out of scope for this phase:

- Publishing to npm.
- Splitting into a separate Git repository.
- Building non-React integrations.
- Adding payments or selling memberships.
- Re-opening the shared-Supabase product scoping decision.
- Changing existing product behavior as part of extraction.

## Proposed Repository Shape

The recommended shape is a workspace-style repository where the **Supabase Project** is first-class and repo-like even while nested inside this checkout:

```text
backend/
  README.md
  package.json or equivalent command surface
  supabase/
    config.toml
    seed.sql
    functions/
    migrations/

packages/
  class-management-react/
    src/
      client/
      components/
      hooks/
      types/
      styles/
    README.md

apps/
  class-management-playground/
    src/
    README.md

src/
  app/site-specific Eden website code
```

The backend folder should own the **Supabase Project** as if it were a different local folder or remote backend project. It happens to live inside this repo while the product is being proven, but the React website should consume it through Supabase URL, publishable key, product key, Edge Function calls, and any approved backend API contract. The frontend should not depend on backend source files being present next to it.

Root-level command wrappers may exist as developer convenience, but they are not the conceptual ownership model. Backend commands, docs, and verification should live in the backend project. The backend project should be able to move elsewhere on the user's machine later with minimal changes to frontend configuration.

The frontend package should be a real local workspace package first. The standalone mini app should be the first consumer, because it lets the product be tested without Eden's landing-page layout. Eden should consume the package only after extraction and playground validation. The package should be designed so it can later move, be copied, or become publishable, but npm publishing is not part of this phase.

## Backend Extraction Design

The backend extraction should move the current Supabase product layer into a dedicated **Supabase Project** boundary. The goal is to act as if the Supabase database, migrations, seed, Edge Functions, and backend RPCs live in a separate backend repo, even before physically splitting repositories.

Backend-owned assets:

- Supabase config.
- Migrations.
- Seed data, including local-only admin and Eden manager test users.
- Edge Functions.
- Backend RPCs and SQL helper functions.
- Shared Edge Function helpers.
- Backend-local command surface.
- Backend verification commands and smoke check documentation.

The backend should keep the current product API names stable:

- `product-context`
- `classes`
- `register-class`
- `templates`
- `schedules`
- `schedule-generate`
- `memberships`
- `manage-registrations`
- `attendance`
- `admin-promote-manager`
- `manager-promote-manager`

Open design risk: Supabase CLI defaults expect `supabase/` at the project root. The implementation plan must define the backend project's command surface from inside the backend folder and may optionally add root convenience wrappers, but frontend code must behave as if repo-root Supabase files do not exist.

## Reusable Frontend Package Design

The reusable package should not be Eden-branded. It should provide the class-management product frontend as a stylable React system for websites that already use React, Tailwind, and ShadCN-style components.

The package should contain:

- Supabase-backed product client.
- API response and domain types.
- Product auth/context provider.
- Hooks for product context, user classes, registration, manager templates, schedules, classes, memberships, and attendance.
- Optional default React components for user and manager workflows.
- Component composition points so a host website can provide layout, theme, copy, and UI primitives.

The package should avoid hard dependency on Eden's `i18n.ts`, Eden layout, Eden fonts, or Eden visual identity.

The package may assume:

- React frontend.
- Tailwind available in the host app.
- ShadCN-style primitives supplied by the host app through a UI primitive adapter, with package defaults for local use.
- Supabase JS client available either as a dependency or peer dependency.

The package should expose both headless behavior and ready-made workflow components rather than one all-or-nothing shell:

- Headless core: API calls, hooks, provider, state helpers, and types.
- Ready-made workflow components: class list, class detail, auth panel, manager template/schedule/class editors, membership/grant views, registration approval, and attendance flows.
- Optional assembled shells: user dashboard, manager dashboard, full product shell.

Eden may use the ready-made workflow components for replacement speed. Future consumer websites may use the same ready-made components or consume the headless core to build custom layouts while preserving product behavior.

## Styling Model

The package should use React, Tailwind, ShadCN-compatible primitives, className/slot/CSS-variable styling, and no Stylus CSS preprocessor. The earlier "stylus frontend" wording was a spelling mistake; the intended meaning is stylable/styled frontend.

The reusable components should be styleable by host apps through Tailwind classes, CSS variables, component slots, and optional className overrides. The design should avoid baking in Eden's poster/editorial style.

Ready-made workflow components should consume a UI primitive adapter rather than importing Eden's local `src/components/ui/**` directly. The adapter should cover the ShadCN-style primitives the workflows need, starting with Button, Input, Label, and Textarea, and expanding only when a workflow requires a real additional primitive. Package defaults can exist for local development and Eden's initial adapter, but consumer websites should be able to supply their own compatible primitives.

The Eden implementation should become a branded composition that wraps or skins the reusable product workflows using Eden's design guide:

- bold, editorial, performance-oriented
- dark mode default
- compact mobile-first app shell
- no generic SaaS filler
- Hebrew-first structure with English/Russian support

## API Boundary

The reusable frontend package should preserve the current implementation contract: product workflow calls from browser code go through Supabase Edge Functions. RPCs may exist inside the **Supabase Project** as backend implementation details, but the **Consumer Website** and reusable React package should not call product tables or RPCs directly unless a future design explicitly creates a safe public RPC contract.

## Standalone Mini App

Before rebuilding the product into Eden, this phase should create a standalone class-management mini app at `apps/class-management-playground`. The **Class Management Playground** is a **Consumer Website** whose purpose is to exercise the reusable frontend package against the **Supabase Project**.

The mini app should:

- import the local workspace frontend package
- configure Supabase URL, publishable key, and product key
- use the package's default or test-focused UI primitive adapter
- expose enough user and manager workflows to validate the product
- be free of Eden's landing-page sections, navigation, and bottom-of-page placement
- support local seeded users `admin@admin.local` and `eden@manager.local`

This app is not the final Eden design. It is the test harness and product playground for the extracted package.

## Eden Reintegration

Eden should stop owning generic class-management workflows directly. During extraction, the current bottom-of-page embedded product UI should be removed from Eden. After the **Supabase Project**, reusable frontend package, and standalone mini app are validated, Eden should reintroduce class-management through a new branded implementation that consumes the reusable package.

Eden should:

- configure the package with `product_key = eden`
- provide Supabase URL and publishable key
- provide branded copy and labels
- provide or map ShadCN-style UI primitives
- choose which package surfaces appear in the Eden page
- apply Eden-specific layout and visual treatment

The current `src/components/product/**` implementation should not remain as the product owner. It should either be deleted, moved into the reusable package, or converted into Eden-specific adapters during implementation planning. The visible behavior should remain equivalent at the product level, but Eden's final UI should be a new design, not the current bottom-of-page embedded management panel.

## Verification Strategy

Because the user has not tested the product yet, extraction must be guarded by behavior-preserving verification before and after replacing the frontend implementation. Baseline smoke testing is a hard gate before moving backend or frontend files.

1. Establish current baseline:
   - `rtk npm run lint`
   - `rtk npm run build`
   - `rtk supabase status`
   - `rtk supabase migration list --local`
   - `rtk supabase db lint`
   - local seeded login for `admin@admin.local` and `eden@manager.local`
   - smoke checks for product context and core Edge Function flows
2. Move backend boundary and verify Supabase commands still work.
3. Remove or disable the embedded Eden product UI while preserving the landing page.
4. Extract frontend client/headless layer into the local workspace package.
5. Extract reusable workflow components into the package.
6. Build the standalone mini app and use it to validate user and manager flows against the **Supabase Project**.
7. Reintegrate the package into Eden through a new Eden-specific design and manually test user and manager flows.

No extraction step should depend on unverified assumptions about the product being correct. If baseline smoke checks fail, extraction should pause until the failure is fixed or explicitly accepted as a known pre-existing issue.

## Planning Boundary Guidance

Future implementation planning should split this into chunks:

- Baseline product verification: prove current branch behavior before extraction.
- Backend boundary extraction: move or wrap Supabase layer and update commands/docs.
- Frontend package foundation: create package boundary, types, client, provider, and hooks.
- Reusable user workflows: package user class discovery and registration flows.
- Reusable manager workflows: package template, schedule, class, membership, registration, and attendance flows.
- Standalone mini app: create a class-management playground that consumes the package and validates the product outside Eden.
- Eden removal pass: remove the current embedded product UI from the bottom of the website without breaking the landing page.
- Eden reintegration: implement a new Eden-specific product UI using the package after playground validation.
- Final verification and documentation: reusable package README, backend README, Eden integration notes.

## Acceptance Criteria

- Backend class-management files are owned by a backend folder boundary with documented commands.
- Supabase local reset/migration/function workflows still work.
- Reusable frontend package can be consumed by Eden without imports from Eden app internals.
- A standalone mini app consumes the package and can test the **Supabase Project** outside Eden.
- Package exports include a headless API/state layer and stylable React workflow components.
- Eden no longer contains the current embedded bottom-of-page product implementation.
- Eden uses the package for class-management workflows only after package/playground validation.
- Eden keeps its branded design separate from reusable product logic.
- Existing class-management behavior is preserved from the user's perspective, except for explicitly approved presentation changes.
- Pre-extraction baseline smoke checks pass before any backend/frontend file movement.
- Local seeded admin and manager accounts can log in.
- Core user and manager product flows are smoke-tested after extraction.
- `rtk npm run lint` and `rtk npm run build` pass.

## Assumptions

- "Stylus frontend" means stylable frontend, not the Stylus CSS preprocessor.
- The first reusable target is local reuse/copy/import across the user's websites, not public npm publishing.
- Future websites use React, ShadCN-style components, and Tailwind.
- The current backend product contract should remain stable unless verification finds real bugs.

## Decision Trail

Resolved decisions are tracked in `agenda.md`. Durable architecture decisions are recorded in ADRs under `docs/adr/`.
