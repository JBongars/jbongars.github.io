# SPEC.md

## What this is
A personal site for a senior SWE / DevSecOps engineer, aimed at recruiters.
Static site, markdown content, hosted free on GitHub Pages.

## Goals
- Recruiter can land on the homepage and within 10 seconds understand who I
  am, what I do, and how to find my resume/LinkedIn.
- Blog section for HackTheBox writeups.
- Projects section for methodologies / in-progress work.
- Resume/experience page, sourced from one data file, linking to LinkedIn.
- Near-perfect Lighthouse scores (performance, accessibility, best practices, SEO).
- Fully functional with JavaScript disabled — no content or navigation may
  depend on JS to work or become visible.
- Very low ongoing maintenance: adding a blog post or project should mean
  "add one markdown file," nothing more.

## Non-goals (explicitly out of scope — do not implement without asking)
- No CMS, no WordPress, no server-side app.
- No JS framework (React/Vue/etc.), no CSS framework (Tailwind/Bootstrap/etc.).
- No dark/light mode toggle — dark mode is the only mode.
- No animation library (GSAP, anime.js) unless I explicitly ask for one later.
- No contact form requiring JS to submit (native <form> only, if added at all).
- No interactive experiences embedded in the main site — those live as their
  own standalone linked projects, not embedded here.

## Content sections
1. Home — hero, one-line role, headshot, links to Resume/Blog/Projects/LinkedIn.
2. Resume/Experience — rendered from a single structured data file.
3. Blog — list + single post view, for HTB writeups and similar long-form posts.
4. Projects — list + single project view, for methodologies/in-progress work.

## Success criteria
- Lighthouse: 95+ on all four categories, ideally 100 on Performance and Best Practices.
- Site works identically with JavaScript fully disabled (minus purely
  decorative animation).
- Adding new content requires zero code changes — only new markdown files.
