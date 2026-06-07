# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript marketing site. Application code lives in `src/`.

- `src/components/layout/` contains shared page chrome such as header, footer, and language menu.
- `src/components/sections/` contains page sections and alternate views, including hero, lessons, about, and Vogue pricing.
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

GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml` and deploys `dist/` from pushes to `master`.

## Coding Style & Naming Conventions

Use TypeScript React components with clear PascalCase component names, e.g. `HeroSection`, `LessonCard`, `VoguePricingView`. Keep component-specific logic local unless it is reused.

Formatting follows `.prettierrc`: tabs, double quotes, semicolons, trailing commas, and `printWidth: 160`. Tailwind classes are used directly in JSX; prefer existing color tokens such as `bg-background`, `text-foreground`, and `text-accent-foreground` before adding custom colors.

Keep copy in `src/i18n.ts`, not inline in components, unless it is a non-translated brand/style term like `New Way`.

For visual decisions, follow `docs/design-guide.md`.

## Testing Guidelines

There is no dedicated test runner configured yet. For changes, run `npm run lint` and, when appropriate, `npm run build`. UI changes should be checked manually in Hebrew, English, and Russian, and in light/dark themes.

## Commit & Pull Request Guidelines

Recent commits use short descriptive subjects such as `Preserve line breaks in private lesson section copy` and `Default theme to dark and validate persisted theme values`. Keep commits focused and describe the user-visible change.

Pull requests should include a concise summary, screenshots for visual changes, notes on affected languages/themes, and any deployment considerations such as GitHub Pages asset paths.

Automated feature work must follow `docs/deployment/development-guideline.md`: use a feature branch, isolated worktree, `--no-ff` merge into `master`, push, then delete the worktree and branch.

## Security & Configuration Tips

Do not commit `.env.local` or secrets. Public assets must work under the GitHub Pages base path; use `import.meta.env.BASE_URL` for runtime asset URLs instead of root-relative `/assets/...` paths.

## Symphony / Trello Routing

Symphony project id is `eden_website`, configured from `/Users/liadgoren/Repositories/openai_symphony/projects/eden.yaml`.

- Trello board: `Eden’s Website` (`6a11a471dd21deb5d5fefc45`).
- Non-dispatch planning list: `תכנון משימות` (`6a11a49d8e83750c92e4cef2`).
- Configured intake route: `6a11a4a29dea19708e782e82`.
- Configured running route: `6a11a76a3e69166f08644ade`.
- Configured review route: `6a11a4a6803299cd0e7db277`.
- Configured blockers route: `6a1551cb7260de4bbc672187`.
- Configured done/on-site route: `באתר :)` (`6a15547f932cfaeb4a34e81d`).
- Common labels: `Feature`, `Bug`, `No Push`, `Plan Required`, `eden_website`.

Use `make register-symphony-reviewer` to register this repo as a reviewer target when review notifications should route here.
