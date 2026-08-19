# sudo

**Author:** Julien Bongars\
**Date:** 2025-09-23 16:12:13
**Path:**

---

What the current user may run as root, then match the binary on GTFOBins.

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

**env_keep** — options kept from the user environment.

**secure_path** — PATH for sudo, blocks PATH injection.

The usable line:

```bash
User postgres may run the following commands on vaccine:
    (ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

Here `vi` is the escalation path.

## Resources

- [sudoers(5)](https://www.sudo.ws/docs/man/sudoers.man/) — `env_keep`, `secure_path`
- [GTFOBins](https://gtfobins.github.io/) — allowed binary → shell
