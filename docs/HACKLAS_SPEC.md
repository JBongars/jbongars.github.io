# HACKLAS_SPEC.md

Instructions for formatting Hacklas notes into finished cheat sheets. The
input is always an existing note under `src/hacklas/`. The job is to reshape
it into the house format below — **not to turn it into a textbook, and not
to silently rewrite or delete the author's material.**

Read this whole file before formatting anything. It is strict.

**Conflict rule:** presentation never wins by deletion. You may reformat
and reorder. You may not remove links, drop sections, or change the
information in a significant way. When a presentation rule here (short
lede, no Wikipedia voice, empty `Path:`, identity placeholders, a
Resources cap, no tables, no cheat.sh dumps) would require deleting,
rewriting, or replacing anything the author already wrote, **keep the
author's content** and attach an editor's note. Do not "fix" the conflict
by changing the note.

---

## Role

You are a formatter of a **quick lookup**. A reader should find the
invocation they need in a few seconds, copy it, and leave.

You do:

- keep **all** of the author's commands, payloads, captured output, prose,
  lists, diagrams, and links
- tidy headings, chrome, fence language tags, and whitespace around that
  material
- reorder sections if a job-oriented shape is clearer
- add a `## Resources` section that includes every URL already in the note
- fill a note only when it is otherwise unpresentable (see _Bare notes_)
- flag identity / OSINT problems with an editor's note — do not strip them

You do not:

- remove information to make the page shorter or "more cheat-sheet-like"
- write Wikipedia-length background **that was not already in the note**
- add emoji, hype, or tutorial padding
- "correct" or optimize the author's commands
- invent box-specific IPs, cookies, hashes, or output
- dump a full man page or `--help` **that the author did not already paste**
- replace, redact, or delete keys, home paths, attacker IPs, or other
  identity — flag them; leave the original in place

---

## Content preservation (the single most important rule)

**Do not remove information.** Reformat and reorder only.

Keep, in full:

- every command, payload, snippet, and log the author wrote
- every URL and markdown/HTML link (inline, reference-style, bare, or
  inside a fence comment)
- every heading's body: overviews, use cases, advantages, attack chains,
  mitigations, checklists, tables, numbered steps
- author comments inside fences (`# Search for an exploit…`, cheat.sh
  blurbs, `# installation`)
- captured ASCII, prompts, and tool banners the author pasted

Do not tidy flags, paths, typos, or spacing **inside** those blocks. Do
not merge or split their fences. Do not truncate captured output. Do not
paraphrase a paragraph into a sentence that drops detail.

**Significant change (forbidden):** replacing a multi-paragraph JNDI
overview with a one-line lede; dropping `searchsploit --www` / `--mirror`
because a shorter "Quick start" already exists; moving a GitHub URL to
Resources and deleting it from the body; swapping the author's links for
"better" ones; blanking a `Path:` the author filled in; rewriting
`YOURIP="10.10.14.147"` to `ATTACKER_IP`.

**Allowed presentation change:** `## Quick Start` → `## Quick start`;
tagging an untagged fence `bash`; putting Resources last; grouping two
existing command blocks under a `## Usage` heading; bolding chrome
(`**Author:**`); stacking a table's rows as headings **if every cell's
text still appears**.

The only prose you may lightly tidy is grammar and heading labels, and
only when the meaning is unchanged. If tidying would drop a fact, leave
the author's wording.

---

## Editor's notes

When you hit a problem — identity leak, contradiction, broken command,
stale URL, textbook-length background, unclear wording, a presentation
rule you cannot apply without deleting something — **do not change the
information.** Attach an editor's note and move on.

Format: an **indented HTML comment** immediately under (or beside) the
content it refers to. Start the comment with `EDITOR` so the author can
grep `<!-- EDITOR`. Critique, clarify, or offer an opinion. Do not
rewrite the surrounding note inside the comment.

```
    <!-- EDITOR
    10.10.14.147 looks like an HTB tun0 address. Consider ATTACKER_IP
    before publishing. Left as written.
    -->
```

Indent the whole comment (four spaces). One note per issue is fine;
do not wrap the author's content in the comment. The author will walk
these blocks and delete or apply them by hand. Never delete an editor's
note you did not write in this pass, and never "resolve" one by editing
the note.

Use editor's notes for (non-exhaustive):

- SSH keys, passwords, home paths, attacker VPN IPs, phone numbers,
  personal emails, API keys, HTB session prompts
- Commands that look wrong, truncated, or copy-pasted from `--help`
- Duplicate sections, conflicting ports/versions, or a title that does
  not match the body
- Background that reads like a textbook (keep it; say so)
- Links that 404, point at a different tool, or are missing a title
- Anything you are tempted to "clean up" by changing

If there is no problem, do not add an editor's note.

---

## Identity

Notes are public. Keep the author name **Julien**. Do **not** silently
strip fingerprints of a home machine, VPN session, or personal account.

If you see an external IP, phone number, key, or home path: **leave it**
and add an editor's note naming the token and a suggested placeholder.
Do not invent a replacement in the note itself.

Tokens worth flagging (examples of placeholders to _suggest_ in the
editor's note, not to apply):

- SSH public keys, passwords, passphrases → `<YOUR_SSH_PUBLIC_KEY>`,
  `<password>`
- Home and notes paths (`/home/julien/...`, `/opt/development/...`) →
  empty `Path:` or `~/...`
- Attacker VPN / tun0 IPs (`10.10.14.x`, OffSec `192.168.45.x`, and
  similar) → `ATTACKER_IP`
- HTB session prompts (`julien23@htb-…`, `eu-dedivip-1`, instance
  hostnames) → `user@htb`
- Phone numbers, personal emails, API keys, AWS account IDs

Not identity (keep, no editor's note required):

- The name Julien and the Author chrome
- HTB *target* IPs (`10.129.x`), box names, fictional box credentials
- Generic RFC1918 examples (`192.168.1.x`), `8.8.8.8`, `10.10.10.10`
- Box SSH *host* keys from nmap output (those are the target, not the
  author)

---

## Bare notes

A note is **bare** when a reader would learn almost nothing from the body:
a lone URL, a single `{{8*8}}`, an empty file after chrome, or a heading
with no command.

Then, and only then, add the smallest useful cheat-sheet body:

1. Prefer [cheat.sh](https://cheat.sh/) for the tool (`curl cheat.sh/<tool>`).
   Copy a few high-value invocations into normal `bash` fences — **do not
   paste cheat.sh's shouty all-caps dump**. Rewrite into the author's usual
   lowercase CLI style.
2. If cheat.sh has no topic, add two or three canonical lookups from a
   cited resource (PayloadsAllTheThings, the project's README, `man`).
   Cite that source under `## Resources`.
3. Stop as soon as the page is usable as a lookup. Three to six commands
   is enough. Do not "complete" the tool.

If the note already has real content — including a cheat.sh dump the
author already pasted — **do not bulk-insert cheat.sh, and do not strip
the dump they already have.** Add Resources and tidy presentation only.

---

## Document structure

Keep the Hacklas chrome so the layout can parse title / author / date
(`parseHacklasMeta` / `stripNoteChrome` in `_11ty/content.js`):

```
# <title>

**Author:** Julien Bongars\
**Date:** <YYYY-MM-DD HH:MM:SS>
**Path:**

---
```

Do not change Author or Date. If `Path:` already has a value, **keep
it** (flag a home-machine path with an editor's note; do not blank it).
Leave `Path:` empty only when it was already empty. Do not invent a path.

After the `---`, the **body** uses `##` / `###` only. The page template
already prints an `h1` from the title. A second `#` in the body becomes a
duplicate top-level heading and a noisy TOC. Demoting a body `#` to `##`
is a presentation change; do not drop the heading's content.

Suggested body shape (omit a block only if the note has nothing for it —
do not omit a block that already exists):

1. **Lede** — keep the author's intro. If they have none, you may add one
   sentence. Do not replace an existing description, README quote, or
   overview with a shorter lede.
2. **`##` sections by job** — Install, Usage, Detection, Listener, and so
   on, only as needed. Reorder existing sections if that helps lookup.
   Each section is the author's prose plus fenced commands.
3. **`## Resources`** — required. Last section. See below.

Fences: tag real invocations `bash`. Use `txt` / `py` / `http` when the
block is output or another language. Do not leave a bare ` ``` ` if you
know the language. Changing the language tag is allowed; changing the
fence's contents is not.

**Do not use markdown tables** for *new* cheat-sheet lookups (they squash
on a phone). Stack entries or use headings. A table that already exists
in the note stays; do not flatten it unless every cell's text is kept.

---

## Resources

Always end with:

```
## Resources

- [Name](https://…) — why a reader would open it
```

**Every URL that already appears in the note must appear here**, including
bare `link: https://…` lines, URLs inside fence comments, and
already-linked names. Do **not** remove those original occurrences from
the body — Resources is a copy, not a move.

You may add the project homepage or GitHub if it is missing. You may add
at most two extra lookup pages (cheat.sh topic, PayloadsAllTheThings,
HackTricks, man page) that were not in the note. Do not drop an author
URL to stay under a cap. Do not replace the author's links with different
ones. No emoji. No "further reading" essays. Sort: official first, then
the author's other links, then any lookups you added.

If the note already has a `## References` / `## Links` / `## See also`
section, keep those entries, fold them into `## Resources` **without
dropping any**, and do not leave a hollow duplicate. If a title is only
a slug, you may give it a readable label; the href stays the same.

---

## Voice & presentation

- Technical, plain, matter-of-fact. Cheat sheet, not a course.
- Present tense is fine. Stay consistent inside a note.
- Bold a lead-in only when it names the variant (`**Listener**`,
  `**Target (no `-e`)**`).
- No marketing voice. No "powerful," "leverage," "comprehensive guide."
- No emoji anywhere. If the author captured a prompt or ASCII that
  contains a symbol, leave that capture alone.

Do not add new textbook framing ("think of it as a phonebook," protocol
histories, feature lists that are not commands). If the author already
wrote that framing, keep it and optionally flag it with an editor's note.

---

## Explicitly banned patterns

- **Deleting the author's material** to satisfy any other bullet in this
  list. Use an editor's note instead.
- **Adding Wikipedia entries.** Protocol histories and feature lists that
  are not in the source note. Existing ones stay.
- **Adding full `--help` / man dumps.** If the author already pasted one,
  keep it. Prefer three example lines only when *you* are filling a bare
  note.
- **Pasting cheat.sh ALL-CAPS blocks** when filling a bare note. Author
  dumps stay.
- **Editing the author's commands** to be cleaner or more correct.
- **Inventing sample output** (nmap greps, whois records, cookies).
- **Removing or swapping links.**
- **Emoji.**
- **Three-column markdown tables** for *new* tools / links / flags.
- **Changing Author or Date.**
- **Second `#` heading** in the body (demote; keep the text).
- **Silent identity redaction.** Flag with an editor's note; leave the
  token.

---

## What to do instead

- Preserve everything the author already had; reshape only the wrapper.
- If the note is empty, add the shortest cheat.sh-backed lookup that makes
  it presentable, then stop.
- Copy every extra URL into `## Resources`; do not delete it from where
  it already lives.
- When stuck, write `<!-- EDITOR` and leave the surrounding lines alone.
- Check the note on the site: TOC should list `##` sections, commands
  should be copyable fences, Resources last. A grep for `<!-- EDITOR`
  should list only the issues you meant to raise.
