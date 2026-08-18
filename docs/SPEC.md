# SPEC.md

## What this is

A personal site for Julien Bongars, an Infrastructure, Cloud & Application
Security Engineer in Singapore. Recruiters and AI agents should both be able
to land on the homepage (or `/llms.txt`) and find resume, blog, and write-ups
without JavaScript.

Live origin: `https://jbongars.github.io/` (user GitHub Pages). Static site,
markdown content, Eleventy 3, deployed on push to `main`.

## Goals

- Recruiter can land on the homepage and within 10 seconds understand who I
  am, what I do, and how to find resume / LinkedIn.
- Blog for long-form depth on skills and projects the resume cannot hold.
- Write-ups for HackTheBox / OffSec-style machines — evidence of hands-on
  offensive work.
- Resume page from one data file (`src/_data/resume.json`), plus a downloadable
  PDF and a JSON Resume at `/resume.json`.
- Agents that follow the site URL from a resume packet can map the whole site:
  `/llms.txt`, sitemap, RSS, Schema.org JSON-LD.
- Near-perfect Lighthouse scores (performance, accessibility, best practices,
  SEO).
- Fully functional with JavaScript disabled — no content or navigation may
  depend on JS to work or become visible.
- Very low ongoing maintenance: adding a blog post or write-up should mean
  "add one markdown file," nothing more (catalogs regenerate from collections).

## Non-goals (explicitly out of scope — do not implement without asking)

- No CMS, no WordPress, no server-side app.
- No JS framework (React/Vue/etc.), no CSS framework (Tailwind/Bootstrap/etc.).
- No animation library (GSAP, anime.js) unless I explicitly ask for one later.
- No contact form requiring JS to submit (native `<form>` only, if added at all).
- No interactive experiences embedded in the main site — those live as their
  own standalone linked projects, not embedded here.
- No `/llms-full.txt` dump of every write-up, no custom RAG API, no MCP server.

## Content sections

1. Home — hero, role, headshot, legend (resume vs blog vs write-ups), CTAs to
   Resume / Blog / Write-Ups / LinkedIn.
2. Resume — from `resume.json`; PDF download; print stylesheet; JSON Resume
   alternate.
3. Blog — list + single post. Giscus comments are **on** for blog and
   write-up posts (`comments.enabled`); the widget needs JS, the heading
   does not.
4. Write-ups — list + single post for HTB / OffSec machines.
5. 404 — CTAs to Resume / Blog / Write-Ups / LinkedIn.
6. Hacklas — optional notes tree, currently **off** (`features.hacklas: false`).

Dark is the default theme. A CSS-first light toggle persists in `localStorage`
when JS is available.

## Machine-readable surfaces

These exist so agents do not need a homemade “click here” JSON blob:

- `/llms.txt` — Markdown map (resume / blog / write-ups contract)
- `/robots.txt` — allow all, Sitemap, note pointing at llms.txt
- `/sitemap.xml` — HTML pages plus PDF, JSON Resume, llms.txt, feed
- `/feed.xml` — combined RSS of blog + write-ups
- `/resume.json` — JSON Resume mapped from `resume.json` (do not replace the
  source data file)
- JSON-LD: `ProfilePage` (home, resume), `CollectionPage` (listings),
  `BlogPosting` / `TechArticle` (posts)
- `rel="describedby"` → llms.txt, `rel="me"` on GitHub / LinkedIn

## Success criteria

- Lighthouse: 95+ on all four categories, ideally 100 on Performance and Best
  Practices.
- Site works identically with JavaScript fully disabled (minus purely
  decorative animation, theme persistence, comments, listing search, and
  code-block / lightbox extras).
- Adding new content requires zero code changes — only new markdown files.
- An agent fetching `https://jbongars.github.io/llms.txt` can reach resume,
  blog, and write-ups from that file alone.
