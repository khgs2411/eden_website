# Design Guide

## Product Direction

This site is a focused dance-teacher landing page for Eden Dafna Goren. The experience should feel bold, editorial, personal, and performance-oriented. Avoid generic SaaS/marketing patterns; the site should feel like a dance poster translated into a usable web page.

## Visual Architecture

The page is built from full-width sections inside a constrained app shell. Keep the main experience direct:

- Hero: identity, photography, and the main dance lesson offer.
- Lessons: schedule cards, lesson-fit disclosure, and click-through paths.
- Vogue pricing view: focused detail page for Vogue registration/pricing.
- About: personal credibility and teaching philosophy.
- Footer: social links.

Do not add landing-page filler, oversized explanatory cards, or nested cards. Cards are for repeated items, disclosures, and pricing tables only.

## Theme & Color

Dark mode is the default. Light mode must remain supported. Prefer existing theme tokens:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `text-accent-foreground`
- `border-border`

The accent color is used for brush text, links, CTAs, interactive details, and highlighted headings. If an anchor ignores Tailwind text color because of global link styling, fix it locally without hardcoding one-theme-only colors.

## Typography

Use the existing font system:

- `font-display` for headings, schedule cards, buttons, and labels.
- Assistant/body font for paragraphs.
- `brush-text` only for expressive hero lettering.

Keep mobile text compact and readable. For multilingual text, preserve intended line breaks with `whitespace-pre-line` where copy includes newline formatting.

## Localization

Hebrew is the primary design baseline. English and Russian should mirror the Hebrew structure, not invent separate messaging. Store user-visible copy in `src/i18n.ts`. Keep non-translated style names such as `Vogue`, `Hip Hop`, and `New Way` literal when that is the intended brand/style term.

## Assets

Images in `public/assets/` must be referenced with `import.meta.env.BASE_URL` from React code so GitHub Pages works under `/eden_website/`. Avoid root-relative `/assets/...` paths.

## Interaction Patterns

Interactions should move the page naturally, not overlay unrelated modals unless necessary. Use inserted panels for disclosures so surrounding content flows down. CTAs should be visibly clickable, keyboard-focusable, and consistent with the accent treatment.
