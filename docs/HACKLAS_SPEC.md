# HACKLAS_SPEC.md

Instructions for formatting Hacklas notes into finished cheat sheets. The
input is always an existing note under `src/hacklas/`. The job is to reshape
it into the house format below — **not to turn it into a textbook, and not
to silently rewrite or delete the author's material.**

Read this whole file before formatting anything. It is strict.

**Conflict rule:** presentation never wins by deletion. You may reformat
and reorder. You may not remove links, drop sections, or change the
information in a significant way. **Exceptions you apply in place, then
stop:** obvious typos, one-letter mistakes, missed flags (`-p`,
`--threads`, `--top-ports`), leftover fence-language tags (`sql--`),
and placeholder hrefs that are not real URLs (`link-to-your-writeup-if-you-have-one`).
When a presentation rule here (short lede, no Wikipedia voice, empty
`Path:`, a Resources cap, no tables, no cheat.sh dumps) would require
deleting, rewriting, or replacing anything else the author already
wrote, **keep the author's content**. Do not attach an editor's note
just because you left it alone.

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
- fix obvious typos, missed flags, leftover language tags, and drop
  placeholder links that are not real URLs
- rarely, attach an editor's note when the author's material looks
  factually wrong and a local one-token fix is not enough (see
  _Editor's notes_)

You do not:

- remove information to make the page shorter or "more cheat-sheet-like"
- write Wikipedia-length background **that was not already in the note**
- add emoji, hype, or tutorial padding
- "correct" or optimize the author's commands (except the one-token
  typos / missed flags in the conflict rule)
- invent box-specific IPs, cookies, hashes, or output
- dump a full man page or `--help` **that the author did not already paste**
- replace, redact, or delete keys, home paths, attacker IPs, or other
  identity — leave the original in place
- stamp an editor's note on every file

---

## Content preservation (the single most important rule)

**Do not remove information.** Reformat and reorder only.

Keep, in full:

- every command, payload, snippet, and log the author wrote
- every URL and markdown/HTML link (inline, reference-style, bare, or
  inside a fence comment), except placeholder hrefs that are not URLs
- every heading's body: overviews, use cases, advantages, attack chains,
  mitigations, checklists, tables, numbered steps
- author comments inside fences (`# Search for an exploit…`, cheat.sh
  blurbs, `# installation`)
- captured ASCII, prompts, and tool banners the author pasted

Do not tidy flags, paths, typos, or spacing **inside** those blocks
except the one-token fixes in the conflict rule (missed `-p`,
`--top-ports`, `icalcs` → `icacls`, leftover `sql--`). Do
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

An editor's note is a **community note**: a public fact-check or
clarification. Use it when the author's material looks incorrect (or
structurally misleading) and a one-token fix is not enough — ambiguous
intent, a larger rewrite, or a command you cannot repair without
inventing a new flow.

**Do not** use an editor's note for things you can just fix:

- spelling / one-letter typos (`FILE_UPLOAwD`, `icalcs`, `phpgcc`)
- missed flags (`sshpass -p`, `--threads`, `--top-ports`)
- leftover fence-language tags (`sql--` → `--`)
- placeholder hrefs that are not URLs — **delete the link**
- heading labels that clearly name the wrong thing (`Internet` vs
  InternalAllTheThings; a second `## Usage` that is `--help`)

It is an **occasional** tool. Most notes should have **zero**. A pass that
puts one on every Path, IP, or textbook paragraph is wrong.

**Do not** use an editor's note for:

- home / notes `Path:` values, attacker VPN IPs, prompts, keys, or other
  identity you left in place (see _Identity_)
- textbook-length background you kept because the author wrote it
- missing Date, empty sections, marketing adjectives, or "I left this
  as written"
- presentation work you already did (demoted headings, tagged fences,
  Resources last)

**Do** use one when:

- two interpretations are plausible and guessing would change the attack
- a flow is contradictory in a way a one-line edit cannot settle
- you have a structure recommendation the author must choose (fold two
  notes, empty stub that might be an index)

The body of the note is the correction or recommendation. Write the
right command or the structure you would use — not "Left as written."

Format: a markdown **block quote** immediately under the content it
refers to. First line of the quote is the title `EDITOR NOTE` (bold).
Do **not** four-space-indent the quote (that becomes a code block in
this pipeline). At most three spaces before `>`.

```
> **EDITOR NOTE**
>
> `script` writes `/dev/shm/linpeas.txt` but the exfil cats
> `/tmp/linpeas.txt`. Unify the path, or this transfer is empty.
```

One note per issue. Do not wrap the author's content in the quote.
Never delete an editor's note you did not write in this pass.

Grep: `EDITOR NOTE`. If a pass produces more than a handful across the
tree, you are over-using them.

---

## Identity

Notes are public. Keep the author name **Julien**. Do **not** silently
strip fingerprints of a home machine, VPN session, or personal account.

If you see an external IP, phone number, key, or home path: **leave it**.
That is not an editor's-note event.

Do not invent a replacement in the note itself. Tokens you might
otherwise have wanted to placeholder (for the author's later pass, not
yours):

- SSH public keys, passwords, passphrases
- Home and notes paths (`/home/julien/...`, `/opt/development/...`)
- Attacker VPN / tun0 IPs (`10.10.14.x`, OffSec `192.168.45.x`)
- HTB session prompts (`julien23@htb-…`, `eu-dedivip-1`)
- Phone numbers, personal emails, API keys, AWS account IDs

Not identity (keep):

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
(`parseHacklasMeta` / `stripNoteChrome` in `_11ty/content.js`). Optional YAML
front matter may precede the `#` title — that is where extra search tags
live (see _Tags_). Do not use Eleventy `tags:`.

```
---
note_tags:
  - xss
  - javascript
---
# <title>

**Author:** Julien Bongars\
**Date:** <YYYY-MM-DD HH:MM:SS>
**Path:**

---
```

The `#` title should name the topic **without the breadcrumbs**. Prefer
`MSSQL / Linked servers` over `Enumeration`, `XSS enumeration` over
`enumeration`, `Windows common utils` over `common`. A reader looking
only at the H1 should know where they are.

Do not change Author or Date. If `Path:` already has a value, **keep
it**. Leave `Path:` empty only when it was already empty. Do not invent
a path.

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

## Tags

Tags exist so a reader on `/hacklas/` can chip-filter notes the same way
the blog listing does: type a term, Space (or Tab) commits it, leftover
text still fuzzy-searches. A chip on a note page is a link to
`/hacklas/?t=<tag>`.

Path segments (dirs + filename stem) are **always** tags. Extra tags are
only the aliases and extra terms the path does not already give. Store
those extras in YAML `note_tags` — **never** Eleventy `tags:`, which
would create collections named after each tag.

When you format a note, fill `note_tags` if it is missing or thinner
than the categories below. Prefer a term that is already in use on
another note (grep `note_tags`) over inventing a synonym.

**Shape**

```
---
note_tags:
  - privesc
  - gtfobins
  - nopasswd
---
```

Lowercase, hyphenated, ASCII. No spaces, slashes, dots, or `#`. One
token per line. Do not quote unless YAML needs it. Do not repeat a path
segment (`escalation/linux/sudo.md` already has `escalation`, `linux`,
`sudo`). Six to ten extras is the usual range; fewer is fine if the note
is a stub.

**What to add** (skip a row that the path already covers):

1. **Stage alias** — `recon` (enumeration / OSINT), `foothold`
   (infiltration), `privesc` (escalation), `pivot` (lateral), `utility`
   (general / convenience / links).
2. **OS** — `linux`, `windows` when the note is OS-specific.
3. **Language** — `php`, `python`, `java`, `powershell`, `bash`, `sql`,
   `javascript`.
4. **Technique** — the short name a reader would type, plus one long
   form when it is common: `xss` / `cross-site-scripting`, `lfi` /
   `local-file-inclusion`, `rfi` / `remote-file-inclusion`, `sqli` /
   `sql-injection`, `ssti` / `template-injection`, `privesc` /
   `privilege-escalation`, `deserialization` /
   `insecure-deserialization`, `rce`, `file-upload`, `file-traversal`,
   `password-spray`, `cracking`, `tunneling`, `jndi`, `oob`, `exfil`.
5. **Tool / protocol aliases** — names not already in the path
   (`netexec` on `nxc.md`, `ncat` on `nc.md`, `john` on hashcat, `smb`,
   `rdp`, `ldap`, `ssh`). CVE id when the note is about that CVE.

Do not tag every command in the body. Do not add box names, IPs, or
author identity. Do not invent a tag that would match half the tree
(`hacking`, `notes`, `cheatsheet` only when the page *is* a dump of
links or keybindings).

On the rendered page, breadcrumbs stay on the path. The Tags row is path
plus extras; those chips are the booru index.

---

## Resources

Always end with:

```
## Resources

- [Name](https://…) — why a reader would open it
```

Do **not** annotate Resources with "already in this note". Describe the
link (`man page`, `NSE script docs`, `GitHub source`).

**Tools:** if Hacklas already has a note for that tool, Resources on
*other* pages should point at that note. The tool's own page is where
GitHub / the man page live. Do not add a Resources row for a source
tarball or `…-1.1.tar.gz` just because an install command uses it.

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
wrote that framing, keep it. That is not an editor's-note event.

---

## Explicitly banned patterns

- **Deleting the author's material** to satisfy any other bullet in this
  list. Keep it. Editor's notes are only for factual / structural
  corrections you cannot apply.
- **Adding Wikipedia entries.** Protocol histories and feature lists that
  are not in the source note. Existing ones stay.
- **Adding full `--help` / man dumps.** If the author already pasted one,
  keep it. Prefer three example lines only when *you* are filling a bare
  note.
- **Pasting cheat.sh ALL-CAPS blocks** when filling a bare note. Author
  dumps stay.
- **Editing the author's commands** to be cleaner or more correct,
  except the one-token typos / missed flags in the conflict rule.
- **Inventing sample output** (nmap greps, whois records, cookies).
- **Removing or swapping links**, except placeholder hrefs that are
  not real URLs.
- **Emoji.**
- **Three-column markdown tables** for *new* tools / links / flags.
- **Changing Author or Date.**
- **Second `#` heading** in the body (demote; keep the text).
- **Silent identity redaction.** Leave the token.
- **An editor's note on every file.** Occasional, or none.
- **Eleventy `tags:` on a Hacklas note.** That creates collections. Extra
  search terms go in `note_tags` (see _Tags_).

---

## What to do instead

- Preserve everything the author already had; reshape only the wrapper.
- If the note is empty, add the shortest cheat.sh-backed lookup that makes
  it presentable, then stop.
- Copy every extra URL into `## Resources`; do not delete it from where
  it already lives.
- When the author's command has a one-token typo or missed flag, fix it.
  When the href is not a URL, delete the link. When intent is ambiguous,
  write `> **EDITOR NOTE**` and leave their lines alone.
- Fill `note_tags` so a reader can chip-filter this note by stage,
  technique, or tool without guessing the folder name.
- Check the note on the site: TOC should list `##` sections, commands
  should be copyable fences, Resources last, Tags chips should include
  the extras. A grep for `EDITOR NOTE` should list only real fact-checks.
