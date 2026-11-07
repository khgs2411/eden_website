# Design Guide

## Product Direction

This site is a focused dance-teacher landing page for Eden Dafna Goren. The experience should feel bold, editorial, personal, and performance-oriented: a ballroom poster with backstage tickets, translated into a usable web page. Avoid generic SaaS/marketing patterns.

## Layout: Mobile First, One Column

The site is a single phone-width column at every screen size. Its width has one owner, `--shell-width` in `src/index.css` (430px; 600px from `lg`), read by the main column, the header, and the menu drawer.

- Design for the narrow column first and only. Do not add desktop multi-column layouts or `md:`/`lg:` layout switches inside sections; they fire on viewport width even though the column stays narrow.
- On desktop, the space beside the column holds the decorative `AmbientBackdrop` (slow vertical outlined words). It is hidden on mobile and carries no content.
- The menu opens inside the column on all screen sizes.

## Visual Architecture

Top to bottom:

- **Hero:** photography, name, brush-lettered tagline, and one line of jump chips to each lesson group (short labels from `lessons.groupsShort`, sized to fit 375px in every language).
- **Marquee band:** a tilted, looping strip of untranslated style terms opening the lessons area.
- **Lesson groups** (`lessonGroups` in `src/data/site.ts`), each with a numbered `SectionHeading` ("01 —" + display title):
  - **Ticket cards** for dated or weekly classes: a stub (one-line date with the month in accent, or a weekday) behind a perforated line with punched notches, then time, title, price, location, and the signup link.
  - **Offer tiles** for contact-style offers: outlined numeral, title, copy, and a bottom-anchored CTA.
  - An optional **notice** (dashed outline, icon, link): a footnote-weight aside, never another offer.
  - An optional **video reel** behind a "play reel" pill (see Media).
- **"Who is this for"** spread: outlined poster word per style, accent bar, bold lead line, then the remaining copy.
- **About:** full-bleed portrait with the name in outline, lead paragraph, remaining paragraphs on an accent rule, and a join card back to the lessons.
- **Footer:** poster-size outlined name sign-off and social links.

Do not add landing-page filler, oversized explanatory cards, or nested cards. Cards are for repeated items (tickets, offer tiles) only; explanatory content is set as type.

## Recurring Motifs

- **Outlined display type** (`.text-outline`): numerals, style words, the name. It is the signature motif; keep it for emphasis, not body text.
- **Numbered section headings** via `SectionHeading`; numbering runs through the page.
- **Scroll reveal** via the `Reveal` wrapper (stagger with `delay`). It respects `prefers-reduced-motion`, as do the marquees.
- **Film grain** overlay on the page body, very low contrast.

## Theme & Color

Dark mode is the default. Light mode must remain supported. Prefer existing theme tokens:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `text-accent-foreground`
- `border-border`

The accent color is used for brush text, outlined type, links, CTAs, interactive details, and highlighted headings. If an anchor ignores Tailwind text color because of global link styling, fix it locally without hardcoding one-theme-only colors.

## Typography

Use the existing font system:

- `font-display` for headings, tickets, buttons, and labels.
- Assistant/body font for paragraphs.
- `brush-text` only for expressive hero lettering.

Keep mobile text compact and readable. For multilingual text, preserve intended line breaks with `whitespace-pre-line` where copy includes newline formatting.

## Localization

Hebrew is the primary design baseline. English and Russian should mirror the Hebrew structure, not invent separate messaging. Store user-visible copy in `src/i18n.ts`. Keep non-translated style names such as `Vogue`, `Hip-Hop`, and `New Way` literal when that is the intended brand/style term.

Bidirectional text needs care in Hebrew:

- Wrap a Latin brand name mid-sentence in `⁨…⁩` when neighbouring numbers or slashes would otherwise reorder.
- Write `Hip‑Hop` (non-breaking hyphen) in card copy so narrow cards never split it.
- Force `dir="ltr"` on fragments like dates (`.11`) whose punctuation would flip.

## Media

- **Images** in `public/assets/` are referenced with `import.meta.env.BASE_URL` (no root-relative `/assets/...` paths). Ship them resized to about twice their displayed size and re-encoded (~80% JPEG quality); raw originals stay out of the repo.
- **Videos** live in `public/videos/` as web-ready H.264 MP4 with a small poster JPG each, listed per group with their pixel size so layout space is reserved. Loading is staged: nothing is in the page until the reel is opened, opening fetches only posters (`preload="none"`), and a video streams only when played. One video plays at a time; download controls are hidden.
- **Raw source media** (e.g. WhatsApp exports) go in the root `assets/` folder, which is git-ignored.

## Interaction Patterns

Interactions should move the page naturally, not overlay unrelated modals unless necessary. Use inserted panels for disclosures so surrounding content flows down. CTAs should be visibly clickable, keyboard-focusable, and consistent with the accent treatment. External signup and contact links open in a new tab.
