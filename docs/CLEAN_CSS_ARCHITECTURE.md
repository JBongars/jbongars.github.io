---
name: clean-css-design
description: Conventions for writing and reviewing CSS and component styles — token-driven, DRY, mobile-first, progressively enhanced. Use this skill whenever you are writing, editing, or reviewing any stylesheet, Tailwind config, styled-component, CSS module, design system, theme, or UI component's visual layer, even when the user only asks to "style this", "make it responsive", "match the mockup", or "clean this up". Also use it when picking spacing, colors, type sizes, or breakpoints for anything.
---

# Clean CSS Design

Build UI that looks deliberate because it is _consistent_, not because every value was hand-tuned. A design where thirty elements share six spacing values reads as designed. A design where thirty elements have twenty-nine spacing values reads as accidental, no matter how carefully each one was chosen.

The core discipline: **decide once, reuse everywhere, and resist the urge to tweak.**

---

## 1. Tokens are the only source of truth

Every visual value comes from a named custom property. Raw values appear in exactly one place — the token block — and nowhere else.

```css
:root {
  /* Spacing — one geometric-ish scale, ~6-8 steps, no more */
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-s: 1rem;
  --space-m: 1.5rem;
  --space-l: 2rem;
  --space-xl: 3rem;
  --space-2xl: 5rem;

  /* Type — fluid, so breakpoints don't have to touch it */
  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --step-1: clamp(1.2rem, 1.1rem + 0.5vw, 1.5rem);
  --step-2: clamp(1.44rem, 1.25rem + 0.95vw, 2rem);
  --step-3: clamp(1.73rem, 1.4rem + 1.65vw, 2.75rem);

  /* Color — semantic names, never literal ones */
  --surface: oklch(99% 0.002 260);
  --surface-sunk: oklch(96% 0.004 260);
  --ink: oklch(22% 0.01 260);
  --ink-muted: oklch(50% 0.01 260);
  --accent: oklch(58% 0.16 255);
  --accent-ink: oklch(99% 0 0);
  --border: oklch(90% 0.005 260);

  /* Everything else */
  --radius: 0.5rem;
  --radius-lg: 1rem;
  --shadow: 0 1px 2px oklch(0% 0 0 / 0.06), 0 4px 12px oklch(0% 0 0 / 0.06);
  --ring: 2px solid var(--accent);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --duration: 180ms;
  --measure: 65ch;
}
```

Rules:

- **Semantic, not literal.** `--accent`, not `--blue-500`. `--surface-sunk`, not `--gray-100`. A literal name forces a rename when the design changes; a semantic one just gets a new value. (A two-tier system — literal palette feeding semantic aliases — is fine on larger projects, but the component layer only ever touches the semantic tier.)
- **Theming is a token override, nothing else.** Dark mode reassigns `--surface` and `--ink` in one block. If dark mode requires touching component rules, the tokens are wrong.
- **A hardcoded value in a component rule is a bug.** The exceptions are genuinely structural: `1px` hairlines, `0`, `100%`, `1fr`, `50%` for a circle.

---

## 2. Mobile-first is a cascade discipline

Mobile-first is not "write the small layout first." It is: **the base rules are the unconditional truth, and media queries only ever add.**

```css
/* Base — no media query. This is what everyone gets. */
.card-grid {
  display: grid;
  gap: var(--space-m);
}

/* Enhancement — only min-width, only additive */
@media (min-width: 48rem) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- **`min-width` only.** Never mix `min-width` and `max-width` in one project. Mixing them means any given element's final value depends on which query won, and that is where responsive bugs live.
- **Never undo in a media query.** If a breakpoint contains `float: none`, `display: block`, or a reset back to a default, the base rule was too specific. Move the specificity into the query instead.
- **Breakpoints are named by content, not device.** Three or four for the whole project, declared once, in `rem`:

```css
/* --bp-s: 30rem; --bp-m: 48rem; --bp-l: 64rem; --bp-xl: 80rem; */
```

Custom properties don't work inside media queries, so keep these as a documented comment (or build-time variables in Sass/PostCSS). Do not invent a fifth breakpoint for one component — see §6.

- **Container queries for components, media queries for page layout.** A card that needs to reflow when it's narrow should ask about _its own_ width, not the viewport's. This is what stops per-component breakpoints from breeding.

```css
.card-list {
  container-type: inline-size;
}

@container (min-width: 30rem) {
  .card {
    grid-template-columns: auto 1fr;
  }
}
```

---

## 3. Let the layout do the responsiveness

The best media query is the one never written. Before adding a breakpoint, check whether the layout can adapt on its own.

```css
/* Responsive with zero breakpoints */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: var(--space-m);
}

.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-s);
}

.stack > * + * {
  margin-block-start: var(--space-m);
}

.prose {
  max-inline-size: var(--measure);
}
```

- Reach for `flex-wrap`, `auto-fit`/`auto-fill` with `minmax()`, `min()`/`max()`/`clamp()`, and intrinsic sizing (`fit-content`, `min-content`) _before_ a media query.
- **Use `gap`, not margins on children.** Gap doesn't leak, doesn't collapse, and doesn't need a `:last-child` cleanup rule.
- **Use logical properties** — `margin-inline`, `padding-block`, `inset`, `max-inline-size`. One declaration where physical properties need two, and it survives RTL for free.
- Assemble pages from a handful of layout primitives (stack, cluster, grid, sidebar, center) rather than giving every section bespoke layout rules.

---

## 4. DRY: write what the minifier would have produced

clean-css's Level 2 pass exists to merge duplicate rules, collapse properties into shorthand, drop overridden declarations, and remove redundant rules. **Treat that list as an authoring checklist.** If a minifier would meaningfully restructure your CSS, the source was carrying redundancy a human has to read.

- **Declare once.** If you're overriding a property you set twenty lines earlier, restructure — don't stack.
- **No duplicate blocks.** Two selectors with identical declarations become one comma-separated selector, or one class used twice.
- **Shorthand when you own all the parts** (`padding: var(--space-s) var(--space-m)`); longhand when you're deliberately setting one axis. Never shorthand-then-override.
- **One notation per value type** across the project — pick `oklch()` (or `hsl()`, or hex) and stay there. Mixed notation makes "is this the same color?" a manual comparison.
- **`0` has no unit.** No `0px`, no trailing zeros.
- **No hand-written vendor prefixes.** That's Autoprefixer's job.
- **The rule of three:** two similar things stay separate; the third one becomes a shared class or token. Don't abstract on the first repeat, don't tolerate it on the fourth.

---

## 5. Selectors and naming

- **Flat and low-specificity.** Single class selectors do almost all the work. No IDs, no `div.card > ul li a` chains.
- **Never `!important`** outside a genuine utility class. If you needed it, the specificity ladder is already broken — flatten it instead.
- **Pick one naming convention and keep it.** BEM-ish (`.card`, `.card__title`, `.card--featured`) is a fine default; the specific choice matters much less than the consistency.
- **Use `@layer`** to make cascade order explicit and stop specificity fights before they start:

```css
@layer reset, tokens, base, layout, components, utilities;
```

- **State goes on data attributes or standard ARIA**, not stacked classes: `[data-state="open"]`, `[aria-expanded="true"]`. It keeps state visible to CSS, JS, and assistive tech at once.

---

## 6. Consistency over precision (the anti-pedantry rules)

This is the section that matters most, and the one most often ignored.

- **Snap to the scale.** A mockup says 18px, the scale has 16 and 20 — pick one and move on. The 2px is invisible; the inconsistency is not.
- **A value earns a token by appearing three times.** Until then, use the nearest existing token. Do not add `--space-1.5s`.
- **Don't add a breakpoint for one component.** Fix it with intrinsic layout or a container query, or accept that it looks slightly different at 900px.
- **Don't tune per element.** If six cards need "a bit more breathing room", change the token or the layout primitive once — don't nudge six rules by different amounts.
- **Don't micro-optimize what you can't see.** Sub-pixel letter-spacing, 3% opacity differences, one-off easing curves, `1.03` line-height adjustments. These cost real maintenance and buy nothing.
- **Stop at good.** When a component matches the system and the layout holds from 320px up, it's done. Further tweaking makes it _different_, not better.
- **Boring and consistent beats clever and varied.** Every exception is a rule someone has to learn.

---

## 7. Progressive enhancement

- **The base layer must work.** Semantic HTML, real content flow, and readable type before any layer of enhancement.
- **Feature-detect additive features** with `@supports`, and structure it so the fallback is what's already there:

```css
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-s);
}

@supports (grid-template-rows: masonry) {
  .gallery {
    display: grid;
    grid-template-rows: masonry;
  }
}
```

- **Respect user preferences, always:**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Also honor `prefers-color-scheme` and `prefers-contrast` — each as a token override, per §1.

- **Accessibility is part of the baseline, not a pass at the end.** Visible `:focus-visible` styling on every interactive element, 4.5:1 contrast for body text, tap targets ≥ 44px, and never color as the sole signal.
- **Transition specific properties**, not `all`, and prefer `transform`/`opacity` so animation stays off the main thread.

---

## 8. File architecture

```
styles/
  tokens.css       /* custom properties only — the whole design system */
  reset.css        /* small, modern reset */
  base.css         /* element defaults: body, headings, links, forms */
  layout.css       /* the layout primitives: stack, cluster, grid, center */
  components/      /* one file per component, flat selectors */
  utilities.css    /* a short, closed set — not a framework */
```

- Order matches the `@layer` declaration.
- **The utilities file is capped.** A handful of genuine escape hatches (`.visually-hidden`, `.flow-tight`). If it grows past a screen, tokens or layout primitives are missing.
- Using Tailwind or similar? Same principles, different syntax: the token scale lives in the theme config, arbitrary values (`p-[13px]`) are the equivalent of hardcoding, and repeated class strings hitting the rule of three become a component.

---

## 9. Review checklist

Before calling any stylesheet done:

- [ ] No hardcoded colors, spacing, or font sizes outside `tokens.css`
- [ ] Every media query is `min-width` and purely additive
- [ ] Nothing is undone or reset inside a breakpoint
- [ ] No breakpoint added for a single component
- [ ] No `!important` outside utilities; no ID selectors; no deep descendant chains
- [ ] No property declared twice in the same rule path
- [ ] Spacing values all come from the scale — count the distinct ones; if it's more than ~8, something drifted
- [ ] Layout survives 320px → 2560px without horizontal scroll
- [ ] `:focus-visible` is visible on every interactive element
- [ ] `prefers-reduced-motion` honored
- [ ] Dark mode (if present) is a token override only

---

## 10. When the user asks for a tweak

Ask which layer it belongs in, in this order:

1. **Token** — "make it more spacious" → change `--space-m`, done everywhere.
2. **Layout primitive** — "cards are cramped on tablet" → adjust the grid's `minmax()`.
3. **Component** — genuinely local, genuinely one-off.

Default to the highest layer that solves it. Reaching for layer 3 first is how a consistent system turns into three hundred special cases.
