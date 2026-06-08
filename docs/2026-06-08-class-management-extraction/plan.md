# Class Management Extraction And Reusable Frontend Implementation Plan Set

**Spec:** `spec.md`
**Agenda:** `agenda.md`
**Context:** `../../CONTEXT.md` updated and available
**ADRs:** `../adr/0001-shared-supabase-product-scoping.md`, `../adr/0002-rolling-schedule-materialization.md`, `../adr/0003-nested-supabase-project-boundary.md`, `../adr/0004-local-workspace-frontend-package.md`
**Status:** Chunk Plans Written

## Goal

Extract the existing class-management implementation into a first-class nested Supabase Project, a local workspace React package, and a standalone class-management playground before reintroducing the product into Eden as a Consumer Website. The plan set must preserve current backend behavior and the current browser API contract, remove the embedded bottom-of-page Eden product UI, and prove behavior through baseline and post-extraction smoke checks.

## Source Artifacts

Design artifacts:

- Root spec: `docs/2026-06-08-class-management-extraction/spec.md`
- Agenda: `docs/2026-06-08-class-management-extraction/agenda.md`
- Glossary/context: `CONTEXT.md`
- ADR 0001: `docs/adr/0001-shared-supabase-product-scoping.md`
- ADR 0002: `docs/adr/0002-rolling-schedule-materialization.md`
- ADR 0003: `docs/adr/0003-nested-supabase-project-boundary.md`
- ADR 0004: `docs/adr/0004-local-workspace-frontend-package.md`

External audit:

- Sub-agent `Raman` (`019ea763-28ef-71b3-9129-3a9f5d0ad30b`) audited the design with `plan-auditor`.
- Verdict: `Ready for Development`, interpreted for this workflow as ready to proceed to `$pmp-writing-plans`.
- Audit score: `63/70`.
- Critical issues: None.
- Audit recommendations carried into this roadmap:
  - baseline smoke suite first
  - backend command-surface chunk must verify nested Supabase CLI behavior
  - split frontend package foundation, user workflows, and manager workflows
  - keep Eden UI removal separate from Eden reintegration
  - mark future paths as planned, not missing

Roadmap approval:

- User approved the audited roadmap with "proceed".
- Chunk plan files were generated after approval.

Code paths inspected:

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `eslint.config.js`
- `components.json`
- `README.md`
- `.env.example`
- `src/App.tsx`
- `src/index.css`
- `src/lib/supabase.ts`
- `src/lib/product-api.ts`
- `src/lib/product-context.tsx`
- `src/lib/product-context-state.ts`
- `src/components/product/**`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/textarea.tsx`
- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/functions/**`
- `supabase/migrations/**`

Current product frontend footprint:

- `src/lib/product-*.ts*` and `src/lib/supabase.ts`: 290 lines.
- `src/components/product/**`: 1,794 lines.
- Total current frontend product surface inspected: 2,084 lines.

Test / validation commands discovered:

- `rtk npm run lint`
- `rtk npm run build`
- `rtk supabase status`
- `rtk supabase migration list --local`
- `rtk supabase db lint`
- `rtk supabase functions serve`
- `rtk curl ... http://127.0.0.1:54321/auth/v1/token?grant_type=password`
- `rtk docker exec supabase_db_eden_website psql ...`

## Design Readiness Check

- Source artifact paths verified: Pass.
  - Existing source artifacts are present.
  - Planned future paths `backend/`, `packages/class-management-react/`, and `apps/class-management-playground/` do not exist yet and are expected outputs of this plan set.
- Missing or unavailable artifacts: None.
- Open agenda questions or risks:
  - Live agenda questions: None.
  - Pressure test: Complete.
  - Non-blocking risks carried into planning:
    - Supabase CLI behavior after moving `supabase/` must be proven.
    - Baseline smoke suite must distinguish pre-existing failures from extraction regressions without becoming full QA.
- Spec / agenda / context / ADR consistency: Pass.
  - `CONTEXT.md` defines **Supabase Project**, **Consumer Website**, **Class Management Playground**, **Reusable Frontend Package**, **Headless Core**, **Workflow Component**, and **UI Primitive Adapter**.
  - ADR 0003 matches the nested Supabase Project boundary.
  - ADR 0004 matches local workspace package, Headless Core, Workflow Components, and UI Primitive Adapter.
- Parent / child spec consistency: Not applicable.
  - This design has no child specs.
  - It preserves the prior class-management product spec and schedule ADRs without reopening their domain decisions.
- Accepted planning reconciliations:
  - The spec says the working tree already has local modifications for Supabase auth storage recovery and local seed users. Current `git status --short` during audit showed only design artifact changes. Treat this as stale bookkeeping, not a product decision. The plan should not assume those prior file edits are still unstaged.
  - `apps/class-management-playground`, `packages/class-management-react`, and `backend/supabase` are future planned paths, not missing current artifacts.
  - `supabase/config.toml` currently lists explicit function config entries for several functions but not every function used by the frontend. The backend extraction chunk owns verifying local function serve/invoke behavior after the move instead of assuming config coverage is complete.
- Blockers: None.

## Unresolved Decision Ownership

| Item | Type | Owning Chunk | Must Resolve Before | Notes |
| --- | --- | --- | --- | --- |
| Exact baseline smoke coverage | Deferred implementation decision | `01-baseline-product-smoke.md` | Implementation steps in owning chunk | Must stay small but prove seeded login, product context, class listing, and representative manager flows before extraction. |
| Nested Supabase CLI command surface | Risk | `02-supabase-project-extraction.md` | Implementation steps in owning chunk | Must prove commands work from the backend folder after moving `supabase/`. |
| Function config coverage after backend move | Risk | `02-supabase-project-extraction.md` | Implementation steps in owning chunk | Must verify all Edge Functions used by the frontend can serve/invoke locally. |
| Workspace package tooling shape | Deferred implementation decision | `04-workspace-and-package-scaffold.md` | Implementation steps in owning chunk | The repo currently has no workspaces; choose the smallest npm workspace shape that preserves existing root commands. |
| UI Primitive Adapter exact interface | Deferred implementation decision | `06-ui-primitive-adapter-and-defaults.md` | Implementation steps in owning chunk | Affects exported package API and all Workflow Components. |
| Current Eden embedded UI removal point | Sequencing risk | `03-remove-embedded-eden-product-ui.md` | Implementation steps in owning chunk | Must remove bottom-of-page product UI without breaking landing-page routes/layout. |
| Eden final placement and presentation | Deferred implementation decision | `11-eden-reintegration.md` | Implementation steps in owning chunk | Should use package APIs after playground validation; exact layout can be designed inside the bounded Eden integration chunk. |

## Proposed Chunks

| Chunk | Purpose | Depends On | Enables | Status |
| --- | --- | --- | --- | --- |
| [`01-baseline-product-smoke.md`](plans/01-baseline-product-smoke.md) | Define and run the pre-extraction smoke gate against the current implementation: static checks, local Supabase status, seeded auth login, product context, user class listing, and representative manager Edge Function calls. | None | All extraction chunks | Written |
| [`02-supabase-project-extraction.md`](plans/02-supabase-project-extraction.md) | Create the first-class nested Supabase Project boundary under `backend/`, move Supabase-owned files, add backend-local command/docs surface, and prove local Supabase commands and Edge Functions still work from the backend folder. | `01-baseline-product-smoke.md` | Package/playground work against a decoupled backend | Written |
| [`03-remove-embedded-eden-product-ui.md`](plans/03-remove-embedded-eden-product-ui.md) | Remove the current bottom-of-page embedded class-management UI from Eden while preserving the landing page, i18n, theme, and legacy public lesson signup behavior. | `01-baseline-product-smoke.md` | Clean Consumer Website baseline before package reintegration | Written |
| [`04-workspace-and-package-scaffold.md`](plans/04-workspace-and-package-scaffold.md) | Add the local workspace structure and minimal package/app scaffolds for `packages/class-management-react` and `apps/class-management-playground` without moving product behavior yet. | `01-baseline-product-smoke.md` | Headless/package extraction and playground development | Written |
| [`05-headless-core-extraction.md`](plans/05-headless-core-extraction.md) | Extract Supabase client configuration, product API wrapper, auth/product context, shared API response/domain types, and package exports into the Reusable Frontend Package. | `04-workspace-and-package-scaffold.md` | UI adapter, user workflows, manager workflows | Written |
| [`06-ui-primitive-adapter-and-defaults.md`](plans/06-ui-primitive-adapter-and-defaults.md) | Define the UI Primitive Adapter contract and package defaults for ShadCN-compatible primitives needed by ready-made Workflow Components. | `05-headless-core-extraction.md` | Reusable Workflow Components | Written |
| [`07-user-workflows-package-and-playground.md`](plans/07-user-workflows-package-and-playground.md) | Extract user-facing auth/class discovery/detail/registration components into the package and wire them into the Class Management Playground. | `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md` | User-flow validation and manager playground context | Written |
| [`08-manager-class-schedule-workflows.md`](plans/08-manager-class-schedule-workflows.md) | Extract manager template, schedule, generated class, pending registration, and class-edit/cancel workflows into package components and playground routes/sections. | `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md` | Manager class/schedule validation | Written |
| [`09-manager-membership-attendance-workflows.md`](plans/09-manager-membership-attendance-workflows.md) | Extract manager membership type, membership grant/ledger, trial attendee, and attendance session workflows into package components and playground routes/sections. | `05-headless-core-extraction.md`, `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md` | Full manager product validation | Written |
| [`10-playground-validation-and-hardening.md`](plans/10-playground-validation-and-hardening.md) | Use the Class Management Playground as the first Consumer Website to validate the Supabase Project and package end to end, including seeded account docs and smoke scripts/checklists. | `02-supabase-project-extraction.md`, `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md` | Eden reintegration | Written |
| [`11-eden-reintegration.md`](plans/11-eden-reintegration.md) | Reintroduce class-management into Eden through the package only, using Eden-specific composition and styling while preserving product behavior and not re-owning product logic. | `10-playground-validation-and-hardening.md`, `03-remove-embedded-eden-product-ui.md` | Final site verification | Written |
| [`12-final-docs-and-handoff.md`](plans/12-final-docs-and-handoff.md) | Update root/backend/package/playground/Eden docs, final verification notes, and handoff guidance for future package extraction or moving the Supabase Project out of the repo. | `11-eden-reintegration.md` | Execution handoff and future reuse | Written |

Boundary notes:

- `01` is its own chunk because extraction must not begin without baseline evidence.
- `02` is separated from frontend package work because Supabase CLI and Edge Function command behavior are the highest backend extraction risk.
- `03` is separate from Eden reintegration because removing the embedded UI is a different risk from adding the new package-based UI.
- `04` is separated because the repo currently has no workspace package/app structure; tooling should be stable before product code moves.
- `08` and `09` split manager workflows because the current manager frontend surface is large and spans class/schedule operations, memberships, registrations, and attendance.
- `10` is separate because the playground is the package/backend validation harness and must pass before Eden reintegration.

## Dependency Order

1. `01-baseline-product-smoke.md`
2. `02-supabase-project-extraction.md`
3. `03-remove-embedded-eden-product-ui.md`
4. `04-workspace-and-package-scaffold.md`
5. `05-headless-core-extraction.md`
6. `06-ui-primitive-adapter-and-defaults.md`
7. `07-user-workflows-package-and-playground.md`
8. `08-manager-class-schedule-workflows.md`
9. `09-manager-membership-attendance-workflows.md`
10. `10-playground-validation-and-hardening.md`
11. `11-eden-reintegration.md`
12. `12-final-docs-and-handoff.md`

Potential parallelism after roadmap approval:

- `02-supabase-project-extraction.md`, `03-remove-embedded-eden-product-ui.md`, and `04-workspace-and-package-scaffold.md` can be planned independently after `01-baseline-product-smoke.md`, but execution should keep `02` and `04` coordinated around paths and scripts.
- `08-manager-class-schedule-workflows.md` and `09-manager-membership-attendance-workflows.md` can be planned in parallel after `06-ui-primitive-adapter-and-defaults.md`, but `10-playground-validation-and-hardening.md` depends on both.
- `11-eden-reintegration.md` must wait for playground validation and Eden UI removal.

## Shared Contracts

- **Supabase Project boundary**
  - Backend-owned files move under `backend/`.
  - Backend commands and docs live in the backend project.
  - Consumer Websites do not import backend source files.
- **Frontend API boundary**
  - Browser product workflows call Supabase Edge Functions via `supabase.functions.invoke()`.
  - Browser code may use Supabase Auth for session/sign-in/sign-out.
  - Browser code must not call product tables through `supabase.from()` or product RPCs through `supabase.rpc()`.
- **Product API names**
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
- **Workspace paths**
  - Supabase Project: `backend/`
  - Reusable Frontend Package: `packages/class-management-react/`
  - Class Management Playground: `apps/class-management-playground/`
  - Eden Consumer Website: existing root `src/`
- **Frontend package layers**
  - Headless Core: client, provider, hooks, state helpers, types.
  - Workflow Components: user and manager ready-made React workflows.
  - UI Primitive Adapter: host-supplied ShadCN-compatible primitives with package defaults.
- **Environment/config**
  - Consumer Websites use Supabase URL, publishable key, and `product_key`.
  - Local seeded users remain `admin@admin.local` and `eden@manager.local` with password `password`.
- **Behavior preservation**
  - Existing backend product behavior and Edge Function contract remain stable unless smoke testing finds a real pre-existing bug.

## Spec Coverage Map

| Spec Requirement | Covered By | Notes |
| --- | --- | --- |
| Baseline smoke testing is a hard gate before extraction | `01-baseline-product-smoke.md` | Must distinguish pre-existing failures from extraction regressions. |
| Supabase Project is a nested repo-like backend boundary | `02-supabase-project-extraction.md` | Includes backend-local commands/docs and CLI verification. |
| Consumer Website does not depend on backend source files | `02-supabase-project-extraction.md`, `05-headless-core-extraction.md`, `11-eden-reintegration.md` | Frontend config/API boundary remains Supabase Auth + Edge Functions. |
| Remove current embedded Eden bottom-of-page product UI | `03-remove-embedded-eden-product-ui.md` | Must preserve landing page and legacy signup behavior. |
| Local workspace package first | `04-workspace-and-package-scaffold.md` | Creates workspace paths before extraction. |
| Package exposes Headless Core | `05-headless-core-extraction.md` | Client, API wrapper, context/provider, hooks, types. |
| Package exposes host-adaptable Workflow Components | `06-ui-primitive-adapter-and-defaults.md`, `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md` | UI Primitive Adapter defined before workflow extraction. |
| Class Management Playground is first Consumer Website | `07-user-workflows-package-and-playground.md`, `08-manager-class-schedule-workflows.md`, `09-manager-membership-attendance-workflows.md`, `10-playground-validation-and-hardening.md` | Playground lives at `apps/class-management-playground`. |
| Eden consumes package only after playground validation | `10-playground-validation-and-hardening.md`, `11-eden-reintegration.md` | Prevents Eden redesign from hiding behavior regressions. |
| Eden final UI is new design, not the current embedded management panel | `11-eden-reintegration.md` | Presentation can change, product behavior should not. |
| Final docs and future movement/reuse handoff | `12-final-docs-and-handoff.md` | Includes backend/package/playground/Eden docs. |

## Verification Strategy

Repo-native validation should layer static, backend, package, playground, and Eden checks:

- Static/frontend:
  - `rtk npm run lint`
  - `rtk npm run build`
- Supabase/backend:
  - `rtk supabase status`
  - `rtk supabase migration list --local`
  - `rtk supabase db lint`
  - `rtk supabase functions serve`
  - seeded password login checks for `admin@admin.local` and `eden@manager.local`
  - Edge Function smoke checks for product context, class listing, registration, and representative manager actions
- Package/workspace:
  - root lint/build must include workspace paths after scaffold
  - package build/typecheck command to be defined in `04-workspace-and-package-scaffold.md`
- Playground:
  - playground dev/build command to be defined in `04-workspace-and-package-scaffold.md`
  - manual or scripted smoke checks against seeded local Supabase
- Eden:
  - landing page still builds after embedded UI removal
  - final Eden reintegration uses package imports, not backend or old product internals

Each chunk plan must include exact commands and expected pass/fail signals. `supabase db reset` is destructive and should only be used when local data loss is acceptable or after explicit approval in the execution phase.

## Risks And Sequencing Notes

- The current product has not been manually tested by the user. `01-baseline-product-smoke.md` must run first and stop extraction on unexplained failures.
- Moving `supabase/` may affect CLI assumptions, local Docker project state, generated URLs, seed paths, function config, and `deno.lock`. `02-supabase-project-extraction.md` owns command and function verification.
- The repo currently has no workspace package setup. `04-workspace-and-package-scaffold.md` must preserve existing root `npm run lint` and `npm run build`.
- Manager UI extraction is large. It is split into class/schedule workflows and membership/attendance workflows to keep reviews focused.
- Eden UI removal should not delete reusable product code before it is moved or copied into the package in later chunks.
- Eden reintegration should not happen until the playground proves the package/backend contract.
- The current `dist/` directory exists locally. Plan/execution should avoid committing build output unless the repo already tracks it intentionally.
- Root command wrappers are optional convenience only; backend ownership should live in `backend/`.

## Execution Handoff

Recommended next skill after roadmap approval and chunk plan generation: `$pmp-executing-plans`.

External full plan-set audit:

- Sub-agent `Gauss` (`019ea768-6d30-7d70-9978-4d191e8ce72e`) audited the full plan set with `plan-auditor`.
- Verdict after refinement: `Ready for Development`, interpreted for this workflow as ready for `$pmp-executing-plans`.
- Critical issues: None.

Execution should load:

- `docs/2026-06-08-class-management-extraction/plan.md`
- selected files under `docs/2026-06-08-class-management-extraction/plans/`
- `docs/2026-06-08-class-management-extraction/spec.md`
- `docs/2026-06-08-class-management-extraction/agenda.md`
- `CONTEXT.md`
- `docs/adr/0001-shared-supabase-product-scoping.md`
- `docs/adr/0002-rolling-schedule-materialization.md`
- `docs/adr/0003-nested-supabase-project-boundary.md`
- `docs/adr/0004-local-workspace-frontend-package.md`

Recommended execution modes:

- execute one chunk
- execute selected chunks
- execute all chunks in dependency order

Execution must stop on unclear plan steps, failed verification, code/spec conflict, missing dependencies, local data reset risk, or user-requested changes.

## Execution Gate

Chunk plan files exist, the roadmap has user approval, and the full plan set has passed external executor-readiness audit. Execution must still follow `$pmp-executing-plans` preflight before implementation code changes.
