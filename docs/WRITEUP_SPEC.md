# WRITEUP-SPEC.md

Instructions for formatting rough CTF / box writeup drafts into finished
documents. The input is always a rough draft written by the author while
working the box. The job is to reshape it into the house format below —
**never to solve, embellish, or invent the technical content.**

Read this whole file before formatting anything. It is strict. When the
draft and this spec conflict on _presentation_, the spec wins. When they
conflict on _facts, commands, or output_, the draft always wins.

---

## Role

You are a formatter, not an author. You restructure and rewrite connective
prose. You do not:

- change, "clean up," correct, or optimize any command, payload, or code,
- add steps the author didn't perform,
- invent output, IPs, hashes, flags, versions, or CVE details,
- infer a technical result that isn't in the draft.

If something needed to complete a section is missing from the draft, leave
a clearly marked `<!-- TODO: ... -->` note and move on. Do not fill the gap
with plausible-looking content.

---

## Content preservation (the single most important rule)

**Reproduce every log and every code block in full. Never truncate,
abridge, summarize, "..."-collapse, or tidy them.**

- Full nmap output stays full — including every host key, every line.
- Terminal sessions stay complete — prompts, `ifconfig` dumps, flag values,
  everything the author captured.
- Scripts, PoC snippets, SQL, and quoted advisories are reproduced verbatim.
- Do not "fix" a command's paths, flags, spacing, or typos. If the author
  ran it that way, it appears that way.
- Do not merge or split the author's code blocks. Keep their boundaries.

**One exception:** the contents of flag / proof files are redacted, not
reproduced — see **Flags & secrets** below. That is the only thing ever
removed from a log; everything else stays byte-for-byte.

The only content you rewrite is the author's connective _prose_ — the
narration between the code — and only to bring it into the voice below.

---

## Flags & secrets

The proof strings a box hands out — the contents of `user.txt`, `root.txt`,
`flag.txt`, `proof.txt`, and platform equivalents (`local.txt`, etc.) — are
the one exception to _Content preservation_. Their **values are redacted,
never reproduced.**

- Replace the value with a placeholder built from the file it came from:
  `user.txt` → `<user.txt>`, `root.txt` → `<root.txt>`,
  `flag.txt` → `<flag.txt>`, `proof.txt` → `<proof.txt>`.
- Redact the value **wherever it appears** — inside terminal output, as a
  stage's closing result, in Credentials, and anywhere else it shows up ("at
  any stage").
- **Redact only the value.** The command that read it stays verbatim. A
  `cat /root/root.txt` line keeps the command exactly and shows `<root.txt>`
  on the line where the proof string would have been. Prompts, paths, and
  every surrounding line in that block are reproduced in full as usual.
- Do not reformat, wrap, shorten, or annotate the placeholder. `<root.txt>`
  on its own line is the entire replacement.

Passwords, hashes, tokens, and other recovered secrets are **not** globally
redacted — they are real technical content. They stay in the body (in the
  relevant stage and in the _Credentials_ section). A hash the author captured
and cracked is evidence, not a flag; keep it as-is. The **only** place a
literal password or secret is withheld is the _Summary_ — see the Summary
entry under _Document structure_.

---

## Source & copyright

- The author's own drafts are theirs: reproduce them freely and in full.
- Third-party material (someone else's published writeup, an article, a
  vendor advisory) is **not** the author's. Never paste it in verbatim.
  Paraphrase it, keep any direct quote short, cite the source, and link out.
- Advisory/CVE issue text the author already quoted in their draft may be
  kept as a blockquote, attributed to its source.

---

## Front matter

Every document opens with YAML front matter in exactly this shape:

```yaml
---
title: <Box name>
author: <author>
date: <YYYY-MM>
description: "<one-line summary>"   # optional; quoted if it contains a colon
link: [<display url>](<full url>)
banner_path: ../offsec.jpg          # or ../hackthebox.png
disable_tree: true                  # optional; hides the heading TOC
tags:
  - <Platform>        # Offsec, HackTheBox, etc.
  - <Track>           # TJNull, etc. (omit if none)
  - <Difficulty>      # Easy, Medium, Hard, Insane
  - <OS>              # Linux, Windows
  - Hacking
---
```

Ship the file as `src/write-ups/<slug>/index.md` (one folder per box). Keep
screenshots as `![](.media/….png)` next to that file. `description` feeds
meta tags, RSS, and `/llms.txt`; omit it and the site falls back to
`<title> — offensive security write-up by …`.

- `link:` is a markdown link, not a bare URL.
- Pull platform / track / difficulty / OS from the draft. If any is
  genuinely absent, leave a `<!-- TODO -->` rather than guessing.

---

## Document structure

Sections appear in this order. Omit a section only if the draft has
nothing for it (except the ones marked **required**).

1. **`# <Box> — Writeup`** — required. Title line.
2. **Blockquote metadata** — required. Directly under the title, a `>` block
   with platform · difficulty · OS on one line, target host/IP on the next,
   and a `Ref:` link. Example:
   ```
   > Platform: OffSec Proving Grounds (TJNull track) · Difficulty: **Medium** · OS: **Linux**
   > Target: `10.10.10.10` (`box.host`)
   > Ref: [portal link](https://...)
   ```
3. **`## Summary`** — required. Prose (not bullets). One or two paragraphs
   that walk the entire chain start to finish: initial access → each pivot →
   final privesc, naming the key CVE/technique at each hop. A reader should
   understand the whole box from this section alone. If the box has a notable
   intended dead-end, name it in a final sentence.
   The Summary is an **overview**: it gives the reader the general path,
   including the recon/enumeration that surfaced each foothold or credential,
   so they can follow how each value was obtained in the first place — but it
   carries **no secrets**. **No literal passwords, keys, tokens, or flag
   values in the Summary.** Refer to a credential by its role ("the backup
   account's password," "the leaked API key"), never by its value; the actual
   value lives in the _Credentials_ section. Flag values are redacted here as
   everywhere (see _Flags & secrets_).
4. **`## Recon`** — required. Subsections as needed:
   - `### Port scanning` — the scan commands and their **full** output.
   - `### Enumeration` — web/service enumeration, vhosts, content discovery.
   - Use `####` for a specific host/port/service that deserves its own note.
   - After a big log, add one or two sentences calling out the artifacts
     that actually matter (the redirect, the leaked path, the version).
5. **`## Stage N: <short description>`** — one numbered stage per meaningful
   phase of the chain (foothold, shell stabilization, each pivot, escalation).
   Within a stage use `###` / `####` for sub-steps. Every stage ends with the
   concrete result it produced (a shell, a credential, a hash, a redacted
   flag value).
6. **`## Credentials`** — every credential/secret recovered, with where it
   came from. Include even guessed/default creds. Flag/proof strings are
   **not** credentials — they do not go in this section, and their values
   are redacted per _Flags & secrets_.
   **Do not use a markdown table.** Tables squeeze into unreadably thin
   columns on a phone. One entry per credential, stacked:

   ```
   **<where / source>** — `<credential>`
   ```

   If there is a note, put it after the credential on the same line, after
   a semicolon, or on the next line as a short sentence. Example:

   ```
   **Subrion admin panel (`/panel/`)** — `admin:admin`

   **`db.json` (via LFI)** — `testuser@imagery.htb` md5 `2c65c8d7…` → `iambatman`
   Cracked (rockyou).
   ```
7. **`## Key lessons`** — bulleted. Fold the author's retro / "lessons" here.
   Each bullet is a durable, transferable takeaway, bolded lead-in then the
   detail. Keep the author's actual insights; don't replace them with
   generic advice.
8. **`### What went right`** — optional subsection under Key lessons, if the
   draft has a retro worth preserving. Do **not** mention consulting a
   walkthrough, IppSec, or a hint — publish the path as found. Keep
   technical dead ends; drop "I peeked" asides.
9. **`## Tools & cheat sheet`** — required. A bullet list, one item per
   tool actually used — **not a three-column table**, and **not a command
   dump**. Box-specific invocations already live in the stages. This section
   is a map: what was used here, linked to the reusable Hacklas note.

   ~~~~
   - [`tcpdump`](/hacklas/enumeration/tcp/tcpdump.md) — Confirm Log4Shell LDAP callback
   ~~~~

   Link the tool name to the matching `src/hacklas/**/*.md` note with a
   site-root `.md` href (the markdown pipeline rewrites it to a pretty URL).
   Keep the em dash and the **purpose in this box**. If two binaries share
   one row, link each name separately. If no Hacklas note exists, leave the
   name unlinked — **do not invent a note, a path, or a command**. External
   PoC URLs from the draft stay as nested bullets. Drop "command not
   captured." Drop nested command fences.

---

## Dead ends

Failed attempts are content, not clutter. When the author tried a path that
didn't work, keep it as a **`### Dead end: <what>`** subsection inside the
relevant stage. State what was tried, show the command/output, and explain
in one or two sentences _why_ it failed. This mirrors the reference format's
"why the standard technique fails here" and is one of the most useful parts
of a writeup. Never silently delete a documented failure.

---

## Voice & prose

- Technical, plain, matter-of-fact. Write like a practitioner describing
  their own work.
- The prose between commands explains **why** — what a result means, what it
  unlocks, why this is the next move. Not click-by-click narration
  ("then I clicked the button").
- Summary and stage intros are prose. Reserve bullets for Key lessons and
  genuinely list-shaped content.
- Define the payoff of each step at the point it happens.
- Present tense or past tense is fine, but stay consistent within a document.

---

## Images / screenshots

- The drafts reference local screenshots as markdown images, e.g.
  `![](.media/20260223043436.png)`. **Keep every one exactly as the author
  wrote it** — reproduce the `![](.media/xxxx.png)` markdown verbatim and in
  place.
- Do **not** convert them to `<!-- screenshot: ... -->` placeholders, comment
  them out, or drop them. On this site Eleventy copies each `.media/` folder
  next to the write-up, so those paths render in the built page.
- Keep the image in the same position relative to the surrounding prose and
  code that the author placed it in.

---

## Delivery

- Ship on this site as `src/write-ups/<slug>/index.md` (the folder name is
  the URL slug). Screenshots live in `.media/` beside that file.
- No commentary baked into the document beyond the writeup itself and any
  `<!-- TODO -->` markers.

---

## Hard requirements

- **Every log and code block is reproduced in full**, with the single
  exception of flag/proof-file contents (redacted per _Flags & secrets_). If
  you find yourself shortening anything else, stop — that is the top failure
  mode for this task.
- **Flags are redacted; the Summary carries no secrets.** No literal
  `user.txt` / `root.txt` / `flag.txt` / `proof.txt` value appears anywhere in
  the document, and no password, key, token, or flag value appears in the
  Summary.
- **No invented technical content.** Commands, output, versions, CVE
  behavior, IPs, and flags come only from the draft.
- **Front matter and section order match this spec exactly.**
- **Every documented dead end is preserved.**
- **Every image reference is kept as-is.** Reproduce the author's
  `![](.media/xxxx.png)` markdown verbatim and in place; never replace it with
  a placeholder or drop it.
- Verify the finished document reads correctly as Markdown before delivering.

---

## Explicitly banned patterns

These make a writeup read as generic, AI-smoothed, or untrustworthy. None
are permitted, even in a "light" form.

- **Truncating or summarizing output.** No `# ... snip ...`, no "(output
  omitted)", no trimming host keys or repeated lines "for brevity."
- **Editing the author's commands** to be "cleaner," "more correct," or
  "best practice." Reproduce them as written.
- **Inventing the missing middle.** If the draft jumps from payload to root
  without showing the exploit-gen commands, you describe and link — you do
  not fabricate the commands.
- **Reformatting or redacting hashes and other captured artifacts.** Leave
  hashes, tokens, and output exactly as the author captured them. The _sole_
  exception is flag/proof-file contents, which **are** redacted — see _Flags
  & secrets_. This bullet is about not silently mangling everything else.
- **Printing a literal flag value, or putting a password/secret in the
  Summary.** Flag contents are replaced with `<file.txt>` everywhere; the
  Summary names credentials by role, never by value.
- **Marketing / hype voice.** No "effortlessly," "powerful," "leverage the
  full potential," "in this comprehensive guide." Describe what happened.
- **Fake confidence about unverified claims.** If the author wasn't sure why
  something worked, don't assert a clean explanation they didn't make.
- **Emoji as section markers or decoration.**
- **Padding.** No restating the same fact in Summary, stage intro, and
  lesson three times. Say it once, in the right place.
- **Collapsing dead ends into "after some enumeration."** Show the actual
  failed attempt.
- **Reformatting hashes** or redacting the wrong things — leave hashes and
  captured output exactly as the author had them (flag contents are the only
  redaction; see _Flags & secrets_).
- **Dropping or placeholdering the author's images.** Keep the
  `![](.media/…)` markdown as-is.
- **Reordering the attack chain** to look cleaner than it happened, unless
  the author explicitly asks for a "clean path only" version.
- **Markdown tables for Credentials or Tools & cheat sheet.** Credentials
  are stacked entries; Tools is a bullet list of purpose lines that link
  to Hacklas notes when one exists (see _Document structure_). Dump/output
  tables in the body (nmap host-key rows, SSTI dumps) may stay as tables;
  the site scrolls them.

---

## What to do instead (the actual direction)

- Preserve every command and every byte of output; reshape only the prose
  around them. The one thing you take out is the flag/proof value, replaced
  with its `<file.txt>` placeholder.
- Lead each section with the reasoning — why this step, what it revealed —
  then let the untouched logs carry the evidence.
- Keep the author's real dead ends and real lessons; format them, don't
  sanitize them.
- Write plainly, as the person who did the work, with a clear structure
  doing the heavy lifting instead of filler or hype.
