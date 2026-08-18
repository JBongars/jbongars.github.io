# DESIGN.md

## Current look (what is actually on the site)

- Dark default (`--bg: #12161c`). Light theme via a header checkbox; a tiny
  blocking script restores `localStorage` so the first paint matches. Light
  surfaces use `--bg: #f4f6f8` with the same teal / lavender roles.
- Two muted colors, not a rainbow: teal `--accent` (`#3d7a8c`) for links and
  primary CTA borders; lavender `--heading` (`#b8a8d4`) for titles. No
  gradients.
- System sans for body and headings; mono only for tags, dates, CTAs, code.
- Home and 404 use bordered CTA chips (`.home-hero__cta`). Resume uses the
  same chip for **Resume.pdf** next to GitHub / LinkedIn icons.
- Resume has a print stylesheet (chrome hidden, two-column layout, contact
  URLs as text).
- CSS lives as several sheets under `src/css/` and is concatenated into one
  `/css/style.css` at build — still no preprocessor or framework.

## Visual direction

Dark by default, with an optional light theme via a CSS-first header toggle
(persists in localStorage when JS is available). Professional security /
DevSecOps tone — NOT a "hacker" aesthetic: no matrix green, no terminal
glitch effects, no neon, no scanline textures. Reference tone: early
Codecademy (2010-2013) — clean, confident, approachable.

## Color

- Background: near-black charcoal/navy (not pure #000).
- Muted teal for links / primary borders; muted lavender for headings.
  No gradients anywhere.

## Typography

- Body/headings: system font stack, no web font download.
- Monospace: accents only (tags, dates, CTA chips, code) — never body copy.

## Imagery

- Real photos over icons or vector illustrations wherever possible:
  headshot in the hero, real screenshots in write-ups and blog posts.
- No decorative SVG illustrations.

## Motion

- CSS-only. No JS animation library.
- Every animated/hidden state must live inside
  `@media (prefers-reduced-motion: no-preference)` so a browser that doesn't
  support the query just renders the element normally, fully visible.
- Allowed: fade/rise-in on load for hero and section titles, gentle hover
  lift + shadow on cards, animated underline on link hover.
- Not allowed: parallax, scroll-jacking, autoplaying carousels, anything
  that draws attention to itself.

## Hard requirement

Every page must be fully readable and navigable with JavaScript disabled.
Test this before considering any page done.

## Explicitly banned patterns

These are the tells that make a site look AI-generated/vibe-coded at a
glance. None of these are permitted, even as a "subtle" version:

- Any purple-to-blue, pink-to-purple, or blue-to-teal gradient, on
  backgrounds, buttons, text, or borders. No gradients, period — this was
  already a rule, restating because it's the single biggest tell.
- Abstract blob shapes, wavy SVG section dividers, "network of connected
  dots" or "DNA helix" decorative backgrounds, floating particles.
- Glassmorphism: frosted/blurred semi-transparent cards over a busy
  background.
- Generic 3-column "feature grid" with a pastel circular icon background
  above each item.
- Drop shadows on every element to fake depth. Use a 1px border
  (var(--border)) instead of a shadow as the default way to separate a
  card from the background. Shadows only where truly load-bearing (e.g. a
  hover state), and even then, small and subtle.
- Oversized rounded corners (rounded-2xl-everything look). Use a small,
  consistent radius (4-8px), not pill-shaped cards or buttons.
- Marketing-voice copy: "Supercharge your workflow," "Unlock the power of,"
  "Elevate your—." Write like a person describing their own work plainly.
- Sparkle emoji, rocket emoji, or any emoji used as a section icon or
  decorative flourish. If an icon is needed, use a simple monochrome line
  icon or nothing at all.
- Stock "flat illustration person at a laptop" artwork. Consistent with
  the images-over-vector rule already in place.
- Colorful rainbow tag/badge pills (each tag a different bright color).
  Tags use one muted neutral style, differentiated by text only.

## What to do instead (the actual direction)

- Flat surfaces, thin 1px borders, muted teal + lavender, real photos.
- Confident whitespace and a clear type hierarchy instead of decoration
  doing the work.
- Copy that describes what things are, plainly, without selling them.
