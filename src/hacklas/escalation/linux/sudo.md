---
note_tags:
  - privesc
  - gtfobins
  - nopasswd
---
# sudo / sudoers

**Author:** Julien Bongars\
**Date:** 2025-09-23 16:12:13
**Path:** /opt/development/cybersec/hacklas/notes/escalation/linux/sudo.md

---

## List permissions

```bash
sudo -l
```

### Sample request

```bash
postgres@vaccine:~$ sudo -l
[sudo] password for postgres:
Matching Defaults entries for postgres on vaccine:
    env_keep+="LANG LANGUAGE LINGUAS LC_* _XKB_CHARSET", env_keep+="XAPPLRESDIR XFILESEARCHPATH XUSERFILESEARCHPATH",
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, mail_badpass

User postgres may run the following commands on vaccine:
    (ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

### env_keep

sets various options for the current user environment

### secure_path

overrides the current path when using sudo. Prevents PATH injection attacks for sudo

The most critical part of this output is this part:-

```bash
User postgres may run the following commands on vaccine:
    (ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

In this example user can execute these executables including vi (escalation path)

## Reading `sudo -l`

`(who) command` — the user in parentheses is **who you run as**, not who you are.

```txt
(ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
#  ^     ^
#  as    this binary (and only these args)

(root) NOPASSWD: /usr/bin/find
(ALL : ALL) ALL
(ALL) NOPASSWD: ALL
```

- `NOPASSWD` — no password prompt. `PASSWD` is the default.
- `SETENV` — you may keep/set env vars (`sudo -E`, `LD_PRELOAD` if `env_keep` allows it).
- `NOEXEC` — shared-library exec is blocked; GTFOBins "sudo" still worth a try, some break.
- `secure_path` — `sudo` ignores your PATH. Dropping a fake `vi` in `~/bin` will not help.
- `env_keep` — which variables survive. `LD_PRELOAD` / `LD_LIBRARY_PATH` here is the classic hijack.

Look up the binary on [GTFOBins](https://gtfobins.github.io/) (`sudo` tag). `sudo -l` as the first thing after a shell — see [Linux privilege escalation checklist](./checklist-to-escalate.md).

Full grammar: [sudoers(5)](https://www.sudo.ws/docs/man/sudoers.man.html).

## Resources

- [sudo](https://www.sudo.ws/) — official homepage
- [sudoers(5)](https://www.sudo.ws/docs/man/sudoers.man.html) — Defaults, tags, Runas
- [GTFOBins sudo](https://gtfobins.github.io/gtfobins/sudo/) — allowed-command escapes (vi in the sample)
- [Linux privilege escalation checklist](./checklist-to-escalate.md) — `sudo -l` in First looks
