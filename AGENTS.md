# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript marketing site. Application code lives in `src/`.

- `src/components/layout/` contains shared page chrome such as header, footer, and language menu.
- `src/components/sections/` contains page sections and alternate views, including hero, lessons, about, and private lessons.
- `src/components/ui/` contains small reusable UI primitives.
- `src/data/site.ts` stores lesson schedule data.
- `src/i18n.ts` stores Hebrew, English, and Russian copy.
- `public/assets/` contains deployable images and video assets.
- `supabase/` contains local Supabase config and migrations, but GitHub Pages deployment does not require Supabase env vars.

## Build, Test, and Development Commands

- `npm run dev` starts the local Vite dev server.
- `npm run build` runs TypeScript build checks and emits the production site to `dist/`.
- `npm run preview` serves the built `dist/` output locally.
- `npm run lint` runs ESLint over the project.

## Coding Style & Naming Conventions

Use TypeScript React components with clear PascalCase component names, e.g. `HeroSection`, `LessonCard`, `LessonsSection`. Keep component-specific logic local unless it is reused.

Formatting follows `.prettierrc`: tabs, double quotes, semicolons, trailing commas, and `printWidth: 160`. Tailwind classes are used directly in JSX; prefer existing color tokens such as `bg-background`, `text-foreground`, and `text-accent-foreground` before adding custom colors.

Keep copy in `src/i18n.ts`, not inline in components, unless it is a non-translated brand/style term like `New Way`.

For visual decisions, follow `docs/design-guide.md`.

## Testing Guidelines

Install dependencies with `bun install --frozen-lockfile` (SSH access to the private ClassKit SDK is required). `npm test` runs isolated Bun/happy-dom feedback tests with fake APIs. For changes, run `npm run lint` and, when appropriate, `npm run build`. UI changes should be checked manually in Hebrew, English, and Russian, and in light/dark themes; DOM tests do not verify browser layout or native dialog focus.

## Branching and deployment

A push to `master` deploys `dist/` to GitHub Pages through `.github/workflows/deploy-pages.yml`.

Automated feature work must follow `docs/deployment/development-guideline.md`: use a feature branch, isolated worktree, `--no-ff` merge into `master`, push, then delete the worktree and branch.

## Security & Configuration Tips

Do not commit `.env.local` or secrets. Public assets must work under the GitHub Pages base path; use `import.meta.env.BASE_URL` for runtime asset URLs instead of root-relative `/assets/...` paths.
