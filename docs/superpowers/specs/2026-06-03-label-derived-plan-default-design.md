# Label-Derived Plan Default Design

**Date:** 2026-06-03
**Status:** Ready for implementation
**Project:** Eden website

## 1. Summary

Verify Symphony's generated default contract for Eden board cards that carry the `Plan Required` label. For this card, the expected contract is:

- `project_id`: `eden_website`
- `profile`: `plan`
- Planner instructions selected before any implementation work

This is a workflow validation task, not a product feature request. The repository output should therefore be planner artifacts only.

## 2. Context

The Trello card title is `[V2 TEST] Eden board - label-derived plan default`. Its purpose is to confirm that label-derived defaults choose the planning profile on Eden's board when the `Plan Required` label is present.

The current run includes planner phase requirements:

- Produce a design/spec artifact under `docs/superpowers/specs/`.
- Produce an implementation plan artifact under `docs/superpowers/plans/`.
- Produce spec and plan audits under `.symphony/audits/`.
- Write `.symphony/planning_ready.json`.
- Do not write `.symphony/ready_for_review.json`.

## 3. Goals

- Record the expected default contract values in repository-local planning documentation.
- Keep the task scoped to planning artifacts.
- Provide enough implementation guidance for a later worker or reviewer to validate the generated contract without guessing.
- Avoid modifying application code, project-management state, host files, sibling worktrees, or runtime state outside this worktree.

## 4. Non-Goals

- No React, Vite, Supabase, styling, copy, or asset changes.
- No Trello state transitions or project-management operations.
- No creation of `.symphony/ready_for_review.json`.
- No feature branch, merge, push, or deployment action by the planner phase.

## 5. Required Contract

The generated task contract is considered correct when all of these are true:

1. The task resolves to project `eden_website`.
2. The task resolves to profile `plan`.
3. Planner instructions are selected because the card has the `Plan Required` label.
4. The planner phase emits `.symphony/planning_ready.json`, not `.symphony/ready_for_review.json`.

## 6. Verification Source

This worktree does not currently contain an authoritative generated-contract payload. Local `.symphony/task.json` contains only:

- `snapshot`
- `work_branch`

It does not expose `project_id`, `profile`, labels, or planner-instruction selection metadata.

Repository-local verification can therefore prove only that the planner artifacts document the expected contract and that the planner-ready marker is valid. Final verification that Symphony actually generated `project_id: eden_website`, `profile: plan`, and selected planner instructions must be performed by a Symphony reviewer or runtime worker with access to the generated task contract metadata.

If a later worker receives an authoritative runtime payload or command, it should inspect that source directly. If that source reports a different project, profile, or instruction mode, the worker should block with a contract-mismatch reason instead of changing website code.

## 7. Failure Conditions

The generated task contract should be treated as incorrect if:

- The profile is anything other than `plan`.
- The project id is anything other than `eden_website`.
- Implementation-ready output is produced instead of planning-ready output.
- Application source files are changed without a follow-up implementation task that explicitly requires them.

## 8. Acceptance Criteria

- A spec file exists under `docs/superpowers/specs/`.
- A plan file exists under `docs/superpowers/plans/`.
- `.symphony/audits/spec-audit.md` records that the spec matches the card scope.
- `.symphony/audits/plan-audit.md` records that the plan is actionable and planner-scoped.
- `.symphony/planning_ready.json` exists with `status`, `spec_path`, `plan_path`, `spec_audit_path`, `plan_audit_path`, `verdict`, `summary`, and non-empty `verification`.
- `.symphony/ready_for_review.json` is not created by this planner phase.
