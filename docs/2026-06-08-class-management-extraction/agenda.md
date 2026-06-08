# Class Management Extraction And Reusable Frontend Design Agenda

## Status

- Spec: `spec.md`
- State: Complete
- Completion gate:
  - Live agenda questions resolved: Yes
  - Pressure test complete: Yes
  - Spec finalized: Yes

## Documented Decisions

- The product continues to use one shared Supabase backend across products.
- `product_key` remains the public product scope.
- A Product User has one product-scoped role: `manager` or `user`.
- Platform Admin is global product-owner authority, not the Supabase service role.
- Existing browser product workflows currently use Edge Functions through `supabase.functions.invoke()`.
- Future frontend hosts can assume React, Tailwind, and ShadCN-style primitives.
- The current product has not been manually tested by the user yet, so extraction must include baseline verification.
- The reusable frontend is a stylable/styled React frontend, not a Stylus CSS preprocessor project.

## Questions

### Question 1: Backend folder boundary and Supabase CLI compatibility

- Status: Answered
- Branch type: Initial
- Why it matters: A literal move from root `supabase/` to a backend folder may break Supabase CLI defaults, local reset, function serving, and current docs unless we choose a compatibility model upfront.
- Scenario probe: A future agent runs `rtk supabase db reset` from repo root after extraction. Should that command still work directly, fail with a clear instruction to run from `backend/`, or be replaced by a root wrapper command?
- Options:
  - A. Literal backend move with root command wrappers — clean backend ownership while preserving simple root commands through scripts or Make targets.
  - B. Keep root `supabase/` and treat it as the backend folder — least disruptive, but weaker conceptual extraction.
  - C. Move to `backend/supabase` and require developers to work from `backend/` — cleanest boundary, but more workflow friction and more docs updates.
- Recommendation: A. It gives a real backend boundary without making every existing repo-root workflow fragile.
- Answer: Treat the Supabase backend as if it is a separate remote/local backend repo that happens to live inside this repo for now. The React website should connect to it like any other Supabase project through Supabase URL/key and Edge Functions; it should not be conceptually tied to the backend files living in the same repository. Extract the Supabase project into its own folder so it can later move elsewhere on the user's machine after the product is proven.
- Answer impact: Changes model
- Spec impact: Update the spec from "root wrappers preserve repo-root workflow" to "backend is a nested repo-like project boundary; root wrappers are optional convenience, not the conceptual model."
- Context impact: Updated `CONTEXT.md` with **Supabase Project** and **Consumer Website**; "Backend Project" and "Class Management Backend" were not kept as canonical terms.
- ADR impact: Created `docs/adr/0003-nested-supabase-project-boundary.md`.
- Follow-ups: Resolved by Question 1A.

### Question 1A: Supabase Project independence level

- Status: Answered
- Branch type: Follow-up
- Why it matters: The backend extraction can be a shallow folder move or a real repo-like project boundary. The user wants the website to behave as if the backend files do not exist inside this repo.
- Scenario probe: Eden's React app is copied into a repo that has no backend files. It should still work by pointing at a Supabase URL, publishable key, product key, and product API contract.
- Options:
  - A. Real backend project now — add backend-local docs/config/scripts/package surface as needed so commands are run from that folder.
  - B. Move Supabase tree only — keep it minimal, just relocate `supabase/` and document how to run it.
  - C. Hybrid — move Supabase tree now, add only the smallest backend README/command wrappers needed for local use.
- Recommendation: C in the initial draft, but the user explicitly chose A.
- Answer: Option A. Decouple the Supabase Edge Functions and DB project as the **Supabase Project**. This website should become a pure **Consumer Website** of the Supabase Edge Function and RPC project, as if the backend files do not exist in this repo.
- Answer impact: Changes model
- Spec impact: The spec must require a first-class nested Supabase Project boundary with its own command surface and docs now, not a minimal move.
- Context impact: Updated `CONTEXT.md` with **Supabase Project** and **Consumer Website**.
- ADR impact: Created `docs/adr/0003-nested-supabase-project-boundary.md`.
- Follow-ups: Decide whether browser package code is allowed to call RPCs directly or whether RPCs remain behind Edge Functions despite the Supabase Project including RPCs.

### Question 2: Reuse model for the frontend package

- Status: Answered
- Branch type: Initial
- Why it matters: "Copy and paste into every website" and "use as a library" imply different packaging and maintenance behavior.
- Scenario probe: You fix a registration bug in the reusable frontend. Should every website receive the fix by updating a package import, or do you expect to manually copy updated source into each site?
- Options:
  - A. Local workspace package first — Eden imports it as a package, and other sites can later copy or import it. Best for proving package boundaries now.
  - B. Copy-paste source kit — simplest for one-off site reuse, but fixes drift across websites.
  - C. Publishable npm package from day one — strongest reuse contract, but adds packaging/versioning overhead before the product is tested.
- Recommendation: A. Use a workspace package now, design it to be publishable later, and document copy-paste fallback only after the API settles.
- Answer: A. Build the reusable frontend as a local workspace package first.
- Answer impact: Confirms branch
- Spec impact: The extracted frontend should live under a package boundary that Eden imports as a library inside this repo. The package should be designed to move, copy, or publish later, but npm publishing is not part of this phase.
- Context impact: Updated `CONTEXT.md` with **Reusable Frontend Package**.
- ADR impact: Created `docs/adr/0004-local-workspace-frontend-package.md`.
- Follow-ups: None.

### Question 3: Browser API boundary: Edge Functions only or direct RPCs too

- Status: Answered
- Branch type: Conflict
- Why it matters: The user mentioned Edge Functions and RPCs, but the approved architecture says browser product APIs should go through Edge Functions only, with RLS as defense in depth.
- Scenario probe: A host website imports the reusable package and calls a registration action. If the action requires capacity locking and membership stock updates, should browser package code call an RPC directly or call an Edge Function that validates origin, product key, JWT, and role before invoking backend logic?
- Options:
  - A. Edge Functions only for browser package code; RPCs stay backend/internal — preserves current security model.
  - B. Allow selected direct RPC calls from the reusable package — fewer Edge Function wrappers, but reopens RLS/grant exposure risks.
  - C. Split by risk: reads may use RPCs, writes use Edge Functions — more flexible but harder to audit consistently.
- Recommendation: A. The reusable frontend should not weaken the security model we just hardened.
- Answer: The current implementation already uses Edge Functions only for frontend product API calls. Code inspection found product operations routed through `invokeProductFunction()` in `src/lib/product-api.ts`, which calls `supabase.functions.invoke()`. Manager API calls route through `callManagerApi()`, which calls the same wrapper. No frontend `supabase.from()` or `supabase.rpc()` usage was found under `src/`; direct Supabase usage is limited to auth session/sign-in/sign-out.
- Answer impact: Confirms branch
- Spec impact: Record Edge Functions as the existing frontend API contract to preserve during extraction. RPCs may exist inside the Supabase Project but are not currently consumed directly by the website frontend.
- Context impact: Not needed; existing **Supabase Project** and **Consumer Website** terms cover the boundary.
- ADR impact: Not needed because this preserves the already implemented and approved architecture.
- Follow-ups: None for API boundary unless later extraction discovers hidden non-frontend RPC consumers.

### Question 4: Package layering and component ownership

- Status: Answered
- Branch type: Initial
- Why it matters: A reusable frontend can be headless hooks only, full UI components, or both. This determines how much styling freedom other sites get and how much product behavior stays centralized.
- Scenario probe: A future site wants the same registration logic but a completely different class-card layout. Should it import only hooks/types and build its own cards, or customize package cards through slots/classes?
- Options:
  - A. Headless core plus optional default components — most reusable and easiest to style, but more exports to design.
  - B. Full assembled product shell only — fastest to embed, but harder to brand per site.
  - C. Components only, no headless hooks — visually reusable, but business state leaks into host apps.
- Recommendation: A. Keep behavior centralized while allowing Eden and future sites to brand deeply.
- Answer: A. The reusable frontend package should expose both a headless core and ready-made workflow components.
- Answer impact: Confirms branch
- Spec impact: The reusable frontend package must include API/types/hooks/provider exports and ready-made user/manager workflow components. Eden can use the ready-made components initially while future sites can drop to hooks/types for custom layouts.
- Context impact: Updated `CONTEXT.md` with **Headless Core** and **Workflow Component**.
- ADR impact: Created `docs/adr/0004-local-workspace-frontend-package.md`.
- Follow-ups: Resolve how ready-made components receive ShadCN/Tailwind styling primitives.

### Question 5: Styling contract for ShadCN and Tailwind

- Status: Answered
- Branch type: Initial
- Why it matters: ShadCN is usually copied source, not a runtime component library. The package must decide whether it ships UI primitives, imports host primitives, or exposes render slots.
- Scenario probe: Another website has a different Button implementation but compatible ShadCN semantics. Should the package force its own Button, accept host-supplied primitives, or expose unstyled elements?
- Options:
  - A. Host-supplied UI primitives with package defaults — best balance, but requires provider/config design.
  - B. Package ships its own ShadCN-style primitives — easiest initial build, but can duplicate/compete with host design systems.
  - C. Renderless/unstyled only — maximum styling freedom, but slower adoption for each site.
- Recommendation: A. Provide defaults for Eden and local testing, while allowing host apps to override primitives.
- Answer: A. Use a host-supplied UI primitive adapter with package defaults.
- Answer impact: Confirms branch
- Spec impact: The reusable frontend package must define a UI primitive adapter contract for ShadCN-style primitives such as Button, Input, Label, Textarea, and any later select/tabs/dialog primitives. The package can include defaults for local use, but host websites can override primitives to match their design systems.
- Context impact: Updated `CONTEXT.md` with **UI Primitive Adapter**.
- ADR impact: Created `docs/adr/0004-local-workspace-frontend-package.md`.
- Follow-ups: Resolve whether the package is consumed as a local workspace package first or prepared as a copy/paste source kit.

### Question 6: Verification before extraction

- Status: Answered
- Branch type: Risk
- Why it matters: The current product has not been tested by the user. Extracting first without a baseline can preserve, hide, or multiply existing bugs.
- Scenario probe: During baseline smoke, manager login works but schedule generation fails. Should the extraction pause to fix generation, continue moving files and carry the failure forward, or document it as an accepted known bug?
- Options:
  - A. Baseline smoke is a hard gate for core login/product context/listing/manager flows before extraction.
  - B. Only static checks are required before extraction; functional smoke can wait until after package extraction.
  - C. Extract first, then test the new package end to end.
- Recommendation: A. Extracting untested code without baseline behavior is how defects become harder to locate.
- Answer: A. Baseline smoke testing is a hard gate before extraction.
- Answer impact: Confirms branch
- Spec impact: The design must require a pre-extraction baseline covering seeded login, product context, class listing, and representative manager calls before backend or frontend files are moved.
- Context impact: Not needed.
- ADR impact: Not needed because this is a verification gate, not a surprising architecture decision.
- Follow-ups: Define the exact smoke coverage during implementation planning, keeping it small and behavior-focused.

### Question 7: Eden branded implementation scope

- Status: Answered
- Branch type: Initial
- Why it matters: Reimplementing Eden on top of the package could mean a thin adapter, a full UX redesign, or a staged replacement. The extraction design should not accidentally turn into an unbounded product redesign.
- Scenario probe: After the package exists, Eden's manager dashboard still looks utilitarian. Is that acceptable for the extraction phase, or must the Eden branded implementation include a polished editorial manager/user experience before the phase is complete?
- Options:
  - A. Staged: first adapter parity, then Eden branded polish as a separate chunk in the same phase.
  - B. Redesign while replacing components — faster visually, but harder to debug behavior changes.
  - C. Adapter parity only; defer visual polish to a later spec.
- Recommendation: A. Keep behavior replacement and visual polish distinct while still planning both.
- Answer: The screenshots show the current class-management product is embedded directly at the bottom of Eden's website. The user wants to completely remove that embedded implementation, extract the backend and reusable frontend, create a standalone mini app to develop and test the frontend against the Supabase Project, and only afterward implement a new Eden-specific UI using the package.
- Answer impact: Changes model
- Spec impact: The sequence changes from direct Eden package replacement to extract -> standalone mini app playground -> Eden reintegration with new UI. The current embedded bottom-of-page product UI is not the target design.
- Context impact: Updated `CONTEXT.md` with **Class Management Playground**.
- ADR impact: Not needed; the playground location is an implementation workspace decision covered by the package boundary ADR.
- Follow-ups: Decide whether the standalone mini app should live under `apps/class-management-playground`, a separate backend-adjacent folder, or another workspace location.

### Question 8: Behavior-preserving extraction versus product rewrite

- Status: Answered
- Branch type: Follow-up
- Why it matters: The implementation already exists in this website. The next phase should extract and replace ownership boundaries, not reimplement backend behavior or change the product contract.
- Scenario probe: After extraction, a manager signs in and uses the class-management workflows. The UI may be implemented through the new package, but the available actions, Edge Function calls, roles, and product behavior should match the current implementation unless a presentation change is explicitly approved.
- Options:
  - A. Behavior-preserving extraction and frontend replacement — reorganize backend/frontend ownership while preserving the existing product behavior.
  - B. Product rewrite during extraction — use the extraction as an opportunity to change product behavior.
  - C. Visual-only replacement — leave ownership mostly in Eden but change UI presentation.
- Recommendation: A. It matches the user's clarified goal and reduces risk.
- Answer: The user confirmed the goal is not to change implementation behavior. The class-management backend should be extracted, the reusable frontend should be developed from the existing implementation, and Eden should use the new frontend package instead of direct product implementation. End behavior should be the same, with a different frontend implementation.
- Answer impact: Confirms branch
- Spec impact: The spec now states this is a behavior-preserving extraction and frontend replacement, not a backend/product rewrite.
- Context impact: Not needed; existing **Supabase Project** and **Consumer Website** terms cover the boundary.
- ADR impact: Not needed; this narrows scope rather than choosing a surprising architecture.
- Follow-ups: Screenshots can later guide the Eden presentation replacement, but they should not reopen backend behavior unless they reveal a real bug.

### Question 9: Standalone mini app location and ownership

- Status: Answered
- Branch type: Follow-up
- Why it matters: The standalone mini app is now the first consumer of the reusable package and the product test harness. Its location affects workspace setup, dependencies, and whether it is understood as a throwaway harness or a durable development app.
- Scenario probe: A future agent wants to test class management without opening Eden's landing page. They should know exactly which app to run and which package/backend it validates.
- Options:
  - A. `apps/class-management-playground` — clear workspace app boundary, parallel to the Eden website app, durable enough for ongoing package testing.
  - B. `packages/class-management-react/playground` — close to the package, but easier to blur package source with test app code.
  - C. `backend/playground` — emphasizes backend testing, but the mini app is really a Consumer Website/frontend package consumer.
- Recommendation: A. It makes the playground a first-class Consumer Website inside the workspace and keeps package/backend boundaries clean.
- Answer: A. Put the standalone mini app at `apps/class-management-playground`.
- Answer impact: Confirms branch
- Spec impact: The spec should treat `apps/class-management-playground` as the first Consumer Website and first real consumer of the reusable frontend package.
- Context impact: Updated `CONTEXT.md` with **Class Management Playground**.
- ADR impact: Not needed unless this becomes a broader workspace convention beyond this product extraction.
- Follow-ups: None.

### Question 10: Meaning of "stylus frontend"

- Status: Answered
- Branch type: Pressure-test
- Why it matters: The spec currently interprets "stylus frontend" as stylable/stylized React UI. If the intended meaning is the Stylus CSS preprocessor, package dependencies, build config, and styling architecture would change.
- Scenario probe: A future implementer starts the frontend package. Should they install/configure the Stylus preprocessor, or should they build Tailwind/ShadCN-compatible stylable components?
- Options:
  - A. Stylable/stylized frontend — use React, Tailwind, ShadCN-compatible primitives, className/slot/CSS-variable styling; no Stylus preprocessor.
  - B. Stylus CSS preprocessor — add Stylus as part of the frontend package styling stack.
- Recommendation: A. It matches the repeated React + ShadCN + Tailwind direction and avoids adding an unnecessary styling tool.
- Answer: A. The user meant stylable/styled frontend. "Stylus" was a spelling mistake, not a request to use the Stylus CSS preprocessor.
- Answer impact: Resolves branch
- Spec impact: Remove the ambiguity note and state explicitly that the package uses React, Tailwind, ShadCN-compatible primitives, className/slot/CSS-variable styling, and no Stylus preprocessor.
- Context impact: Not needed; this corrects a wording ambiguity, not a durable domain term.
- ADR impact: Not needed because no new styling technology is being adopted.
- Follow-ups: None.

## Pressure-Test Result

- Status: Complete
- Checked categories: lifecycle and sequencing, state persistence, handoff boundaries, verification evidence, scope control, recovery paths, package/backend ownership, user review points.
- Result: One ambiguity was found and resolved: "stylus frontend" means stylable/styled React frontend, not the Stylus CSS preprocessor.
- Remaining non-blocking risks:
  - Supabase CLI behavior after moving `supabase/` under the backend project must be proven in implementation planning.
  - The baseline smoke suite must stay small enough to be practical but broad enough to distinguish pre-existing product failures from extraction regressions.
