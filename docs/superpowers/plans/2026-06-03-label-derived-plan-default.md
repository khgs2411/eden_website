# Label-Derived Plan Default Implementation Plan

**Goal:** Validate that the Eden board card with the `Plan Required` label is handled as a planning-profile task.

**Expected contract:** `project_id` is `eden_website`, `profile` is `plan`, and planner instructions are selected.

---

## Scope Notes

This plan is intentionally small. The Trello card is a workflow-contract test, not a request to alter the website.

The implementer phase, if one is later assigned, should not change app code unless a new task adds product requirements. Its work should be limited to checking the generated contract and confirming the planner artifacts.

## Files

Created by planner:

- `docs/superpowers/specs/2026-06-03-label-derived-plan-default-design.md`
- `docs/superpowers/plans/2026-06-03-label-derived-plan-default.md`
- `.symphony/audits/spec-audit.md`
- `.symphony/audits/plan-audit.md`
- `.symphony/planning_ready.json`

Do not create:

- `.symphony/ready_for_review.json`

Do not modify unless a later product task explicitly asks:

- `src/*`
- `public/*`
- `supabase/*`
- deployment workflow files

## Task 1: Confirm Contract Values

- [ ] Read the authoritative generated contract available to the worker, if Symphony exposes one for the implementation/review phase.
- [ ] Confirm `project_id` is exactly `eden_website`.
- [ ] Confirm `profile` is exactly `plan`.
- [ ] Confirm planner instructions were selected because the `Plan Required` label is present.
- [ ] If no generated-contract payload is available locally, record that limitation and rely on external Symphony runtime/reviewer metadata for final contract verification.

Expected result: all three values match when checked against authoritative runtime metadata. In this worktree, `.symphony/task.json` is not authoritative for these fields because it contains only `snapshot` and `work_branch`. If runtime metadata differs from the expected contract, block or report the contract mismatch instead of making website changes.

## Task 2: Confirm Planner Outputs

- [ ] Confirm the spec path exists under `docs/superpowers/specs/`.
- [ ] Confirm the plan path exists under `docs/superpowers/plans/`.
- [ ] Confirm `.symphony/audits/spec-audit.md` exists.
- [ ] Confirm `.symphony/audits/plan-audit.md` exists.
- [ ] Confirm `.symphony/planning_ready.json` exists and contains non-empty `summary` and `verification`.
- [ ] Confirm `.symphony/ready_for_review.json` was not created by the planner phase.

Expected result: planner outputs are complete and no implementation-ready marker is emitted.

## Task 3: Verification

Run lightweight repository checks:

```bash
node -e "JSON.parse(require('fs').readFileSync('.symphony/planning_ready.json', 'utf8')); console.log('planning_ready.json valid')"
```

Optional source checks such as `npm run lint` are not required for this planner-only task because no app source files should change. If run anyway, report the result honestly.

Repository-local verification should also confirm that the spec names the local limitation explicitly:

```bash
grep -n "does not currently contain an authoritative generated-contract payload" docs/superpowers/specs/2026-06-03-label-derived-plan-default-design.md
```

## Task 4: Closeout Guidance

- If the contract and planner outputs match, hand the task back as planning-ready.
- If the contract does not match, write `.symphony/blocked.json` with reason `planner_contract_mismatch`.
- Do not move Trello cards, create workflow states, or mark the task done.

## Plan Self-Review

- The plan is scoped to the Trello description and the appended planner phase requirements.
- It avoids speculative implementation.
- It gives the next worker exact success and failure conditions.
- It preserves Symphony ownership of workflow-state transitions.
