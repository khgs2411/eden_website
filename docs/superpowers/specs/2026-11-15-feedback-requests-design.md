# Feedback requests design

Status: approved, ready to build. Date: 2026-11-15.

## Goal

Eden (the site owner) can sign in on her phone and file a website change request (something broken, or something new) in under a minute, pointing at the part of the site she means. The request lands in ClassKit, where the developer sees it in class-kit-admin with that context and her screenshots attached.

**How we know it worked:** a signed-in manager files a request from a 375px-wide phone screen, and it appears in class-kit-admin's Requests tab for `eden_website` with section context and attachments.

## Settled facts (already done, do not redo)

- ClassKit product `eden_website` exists: active, `invite_only`, Google sign-in only. Origins and Google redirects: `https://edendafnadance.info` (production) and `http://localhost:5175` (development). Both URLs are also on the Supabase Auth redirect allow-list.
- GitHub Actions secret `CLASS_KIT_SDK_DEPLOY_KEY` exists on `khgs2411/eden_website`, with a matching read-only deploy key on `khgs2411/class-kit-sdk`.
- Inviting Eden as a manager happens in class-kit-admin. It is outside this build.

## Contracts this builds on

- ClassKit SDK guide: `/Users/liadgoren/Repositories/class-kit/docs/sdk/client-sdk.md`, sections "Configure", "React Provider" and "Product Change Requests". Types live in `/Users/liadgoren/Repositories/class-kit/class-kit-sdk/src/manager/manager-api.ts` (`ProductChangeRequest*`).
- Static deploy with the private SDK: `/Users/liadgoren/Repositories/class-kit/docs/shared/deployment.md`, section "Static Website Deployments With The Private SDK".
- Reference integration (behavior only, not its UI): `/Users/liadgoren/Repositories/customer_projects/noya_website/src/features/manager/change-requests/` and Noya's `.github/workflows/deploy-pages.yml`.
- Eden's visual rules: `docs/design-guide.md`. Repo rules: `AGENTS.md`.
- Attachment limits come from the backend's storage bucket: 10 MB per file; `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.

## Scope

### 1. Install and wiring

- Add `@class-kit/react` pinned to `git+ssh://git@github.com/khgs2411/class-kit-sdk.git#v0.1.26`, installed with Bun. Bun becomes the package manager: `bun.lock` is the lockfile, and `package-lock.json` is removed. `npm run <script>` names stay as they are.
- One client module creates `createClassKitClient(import.meta.env, { authStorageKey: "eden-website-class-kit-auth" })`. Wrap the app in `ProductProvider`. Treat a `null` client as "feedback unavailable": the public site renders exactly as before.
- Dev server: `vite.config.ts` pins `server.port: 5175` with `strictPort: true` (the origin registered in ClassKit).
- Commit `.env.development` containing only `VITE_CLASS_KIT_LOCAL_PRODUCT_KEY=eden_website`. This is a non-secret localhost hint (see SDK "Configure"). Do not create or edit `.env.local`.
- Leave the existing `src/lib/supabase.ts` and `signup-section.tsx` untouched.

### 2. CI

Update `.github/workflows/deploy-pages.yml` so that it:
- sets up Bun;
- adds the SSH step for `CLASS_KIT_SDK_DEPLOY_KEY`, as in the deployment doc;
- runs `bun install --frozen-lockfile` and `bun run build`.

Do not copy Noya's version-bump step, its Supabase env vars or its `404.html` fallback: Eden routes by hash and needs none of them.

### 3. Sign-in

- Opening the site with `#manage` shows a sign-in sheet with one action: "Continue with Google" (`signInWithGoogle` from `useProductContext`). There is no visible sign-in entry anywhere else on the public site.
- The session persists. After the OAuth return (which lands on the site root), a signed-in manager sees the manager surfaces without visiting `#manage` again.
- **Manager** means `capabilities.permissions.includes("product_change_requests.manage")`. If someone is signed in without that permission, `#manage` shows a short "this account has no access" note with a sign-out action. Manager surfaces stay hidden for them.
- A manager can sign out from the menu drawer.

### 4. Point-and-tell button

- Managers see a small floating feedback button inside the phone column (`--shell-width`), at the bottom on the inline-end side. It must not cover the header or drawer.
- Tapping it enters **pick mode**:
  - a one-line hint bar ("Tap the part of the site you mean");
  - tappable regions get an outline on hover or focus;
  - a "Not about a specific spot" action skips pointing;
  - Escape or a cancel action leaves pick mode.
- Pickable regions are the existing sections (`home`, `lessons`, each lesson group, `private-lesson`, the about block, the footer). Each lesson ticket and offer tile is also pickable on its own and contributes its lesson id. Use data attributes on existing elements; do not restructure sections.
- Picking a region opens the request sheet, with a chip naming the picked spot (removable).
- The request's `context` is product-owned JSON: `{ section, label, lessonId?, url, language, theme, viewport: { width, height } }`. `label` is the human name shown on the chip.

### 5. Request sheet

- A bottom sheet inside the column. It is the one overlay this feature adds. Its markup is a dialog with focus trapping and Escape to close, and it returns focus to where it came from.
- Fields, in this order:
  1. One textarea, "What should change?" (required, autofocused).
  2. Type as two large chips: "I'd like something new" (`feature_request`, default) and "Something's broken" (`issue`).
  3. Attachments: several files, picked from the device (on phones this offers camera or library) or pasted into the sheet. Validate the type and the 10 MB size on the client, with a clear message.
- There is no title field. `title` is the first line of the description, cut to 80 characters on a word boundary.
- The draft (text, type, context, but not files) is saved to `localStorage` as she types. It is restored when the sheet opens again, and cleared after a successful submit. Every storage access is wrapped in try/catch.
- Submit calls `create`, then uploads each file with `uploadAttachment`, showing per-file progress. If the request saves but a file fails, the request stays saved and that file shows a retry action. After success, a short confirmation replaces the form.

### 6. My requests

- A manager-only entry in the menu drawer, below the nav items, opens "My requests". Show it in place in the column as an inserted panel or view, not a second overlay.
- List from `changeRequests.list()`, newest first, grouped by plain status labels:
  - Received (`open`)
  - Working on it (`in_progress`)
  - Done (`done`)
  - Closed (`closed`)
- Each row shows the title, type chip, spot label and date.
- Tapping a row expands it in place, with:
  - the full description, spot, date, and attachment file names;
  - **Edit:** opens the sheet prefilled, saved via `update` (a new revision, as the API defines it);
  - **Add files:** `uploadAttachment`;
  - **Delete:** a confirm step, then `delete`.
- States to cover: loading, empty (with a "New request" action), load error with retry.

### 7. Copy and visuals

- All copy goes in `src/i18n.ts` in Hebrew (baseline), English and Russian. RTL must work: the button and sheet mirror correctly in Hebrew.
- Follow `docs/design-guide.md`: theme tokens, `font-display` for labels and buttons, accent for CTAs, no nested cards, mobile-only layout with no `md:`/`lg:` layout switches.

## Non-goals

- No changes to ClassKit API, SDK or admin.
- No status changes by the manager.
- No viewing of attachment contents (file names only).
- No customer accounts or other manager tooling.
- No automatic screenshots.

## Done means

- `npm run lint` and `npm run build` pass, and `bun install --frozen-lockfile` works from a clean checkout.
- With no session, the public site is unchanged in he/en/ru and light/dark at 375px. The only visible addition is the `#manage` sheet when that hash is opened.
- Manager surfaces (button, pick mode, sheet, My requests) are checked in all three languages, both themes, at 375px. End-to-end filing needs a manager account. If none is available during the build, report that flow as unverified rather than faking a session in shipped code.
- Work is committed on `feature/feedback-requests`. It is not merged or pushed: merging to `master` deploys production, and that waits for the owner.
