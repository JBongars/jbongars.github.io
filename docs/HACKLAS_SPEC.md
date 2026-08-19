# HACKLAS_SPEC.md

Instructions for formatting Hacklas notes into finished cheat sheets. The
input is always an existing note under `src/hacklas/`. The job is to reshape
it into the house format below — **not to turn it into a textbook, and not
to silently rewrite the author's commands.**

Read this whole file before formatting anything. It is strict. When the
note and this spec conflict on _presentation_, the spec wins. When they
conflict on _facts, commands, or captured output the author already wrote_,
the note always wins.

---

## Role

You are a formatter of a **quick lookup**. A reader should find the
invocation they need in a few seconds, copy it, and leave.

You do:

- keep the author's commands, payloads, and captured output
- tidy headings, chrome, and connective prose
- add a `## Resources` section
- fill a note only when it is otherwise unpresentable (see _Bare notes_)
- strip identity / OSINT (see _Identity_)

You do not:

- write Wikipedia-length background
- add emoji, hype, or tutorial padding
- "correct" or optimize the author's commands
- invent box-specific IPs, cookies, hashes, or output
- dump a full man page or `--help`
- leave keys, home paths, attacker IPs, or other identity beyond the name Julien

---

## Content preservation

**If the author wrote a command, payload, or log, keep it.** Do not tidy
flags, paths, typos, or spacing in those blocks. Do not merge or split
their fences. Do not truncate captured output.

The only content you rewrite freely is connective prose (one-line
descriptions, section titles) and the chrome listed under _Document
structure_. The exception is _Identity_: replace leaking tokens inside
commands and logs; do not delete the command.

---

## Identity

Notes are public. Keep the author name **Julien**. Do not leave anything
else that fingerprints a home machine, VPN session, or personal account.
This is not a strict OSINT teardown — if you see an external IP, phone
number, key, or home path, replace it.

Strip (placeholder, do not drop the line):

- SSH public keys, passwords, passphrases → `<YOUR_SSH_PUBLIC_KEY>`,
  `<password>`
- Home and notes paths (`/home/julien/...`, `/opt/development/...`) →
  empty `Path:` or `~/...`
- Attacker VPN / tun0 IPs (`10.10.14.x`, OffSec `192.168.45.x`, and
  similar) → `ATTACKER_IP`
- HTB session prompts (`julien23@htb-…`, `eu-dedivip-1`, instance
  hostnames) → `user@htb`
- Phone numbers, personal emails, API keys, AWS account IDs

Keep:

- The name Julien and the Author chrome
- HTB *target* IPs (`10.129.x`), box names, fictional box credentials
- Generic RFC1918 examples (`192.168.1.x`), `8.8.8.8`, `10.10.10.10`
- Box SSH *host* keys from nmap output (those are the target, not the
  author)

Do not invent a replacement that is itself identifying.

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

If the note already has real content, **do not bulk-insert cheat.sh**. Add
Resources and tidy presentation only.

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

Do not change Author or Date. Leave `Path:` empty unless the note already
has a path you are not asked to invent.

After the `---`, the **body** uses `##` / `###` only. The page template
already prints an `h1` from the title. A second `#` in the body becomes a
duplicate top-level heading and a noisy TOC.

Suggested body shape (omit a block if there is nothing for it):

1. **One-line lede** — what this is, in a sentence. Not a history of the
   protocol.
2. **`##` sections by job** — Install, Usage, Detection, Listener, and so
   on, only as needed. Each section is a short prose line (optional) plus
   fenced commands.
3. **`## Resources`** — required. Last section. See below.

Fences: tag real invocations `bash`. Use `txt` / `py` / `http` when the
block is output or another language. Do not leave a bare ` ``` ` if you
know the language.

**Do not use markdown tables** for cheat-sheet lookups (they squash on a
phone). Stack entries or use headings. A small dump table that already
exists in the note may stay; the site scrolls it.

---

## Resources

Always end with:

```
## Resources

- [Name](https://…) — why a reader would open it
```

Include the project homepage or GitHub, plus at most two lookup pages
(cheat.sh topic, PayloadsAllTheThings, HackTricks, man page). No emoji.
No "further reading" essays. Sort: official first, then cheat sheets.

---

## Voice & presentation

- Technical, plain, matter-of-fact. Cheat sheet, not a course.
- Present tense is fine. Stay consistent inside a note.
- Bold a lead-in only when it names the variant (`**Listener**`,
  `**Target (no `-e`)**`).
- No marketing voice. No "powerful," "leverage," "comprehensive guide."
- No emoji anywhere, including in captured ASCII art you are not required
  to keep if you did not author it. (If the author captured a prompt that
  contains a symbol, leave that capture alone.)

---

## Explicitly banned patterns

- **Wikipedia entries.** Protocol histories, "think of it as a phonebook,"
  and feature lists that are not commands.
- **Full `--help` / man dumps** unless the author already pasted one and
  you are not asked to delete it. Prefer three example lines.
- **Pasting cheat.sh ALL-CAPS blocks** unchanged.
- **Editing the author's commands** to be cleaner or more correct.
- **Inventing sample output** (nmap greps, whois records, cookies).
- **Emoji.**
- **Three-column markdown tables** for tools / links / flags.
- **Changing Author or Date.**
- **Second `#` heading** in the body.
- **Identity leaks.** Live SSH keys, home paths, attacker VPN IPs, phone
  numbers, HTB session IDs.

---

## What to do instead

- Preserve every command the author already had; reshape only the wrapper.
- If the note is empty, add the shortest cheat.sh-backed lookup that makes
  it presentable, then stop.
- Put every extra URL in `## Resources`, not in a new essay.
- Check the note on the site: TOC should list `##` sections, commands
  should be copyable fences, Resources last.
