# Development & Deployment Guideline

## Purpose

This repository is intended to support automated work through Paperclip and Trello intake. Agents should complete client-requested work in isolated git worktrees, merge it back to `master` with a clean merge commit, push, and remove temporary branches/worktrees.

The goal is a readable `master` history where each feature appears as a clear `--no-ff` merge.

## Required Workflow

Never work directly on `master` for a feature request.

1. Start from an up-to-date `master`.
2. Create a feature branch.
3. Create a worktree for that branch.
4. Do all implementation inside the worktree.
5. Verify the change.
6. Commit on the feature branch.
7. Merge into `master` using `--no-ff`.
8. Push `master`.
9. Delete the worktree.
10. Delete the feature branch.

## Command Template

Use a short kebab-case branch name based on the Trello request.

```bash
git switch master
git pull --ff-only origin master
git branch feature/<short-description>
git worktree add ../eden_website-<short-description> feature/<short-description>
cd ../eden_website-<short-description>
```

After the work is complete:

```bash
npm run lint
npm run build
git status --short
git add <specific-files>
git commit -m "Describe the feature"
cd /Users/liadgoren/Repositories/eden_website
git switch master
git merge --no-ff feature/<short-description>
git push origin master
git worktree remove ../eden_website-<short-description>
git branch -d feature/<short-description>
```

Use specific file staging. Do not use `git add .`.

## Verification Expectations

For visual or content changes, verify:

- Hebrew, English, and Russian render correctly.
- Dark and light themes remain usable.
- Mobile layout is checked, especially lesson cards and hero text.
- GitHub Pages asset paths do not use root-relative `/assets/...`.

Run `npm run lint` and `npm run build` before merging unless the user explicitly says not to. If either command is skipped or fails, report it clearly.

## Deployment

GitHub Pages deploys from `.github/workflows/deploy-pages.yml` when `master` is pushed. The build output is `dist/`. Supabase is optional for the static deployment and should not block GitHub Pages.

The public URL is:

```text
https://khgs2411.github.io/eden_website/
```

## Agent Rules

Preserve client-facing copy and translations carefully. Make surgical changes. Avoid unrelated refactors. If a Trello request is ambiguous, make the smallest reasonable implementation and leave a concise note in the commit or task response describing assumptions.
