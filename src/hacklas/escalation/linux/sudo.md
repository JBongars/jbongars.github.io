# sudo

Author: Julien Bongars
Date: 2025-09-23 16:12:13
Path: /opt/development/cybersec/hacklas/notes/escalation/linux/sudo.md

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

#### env_keep

sets various options for the current user environment

#### secure_path

overrides the current path when using sudo. Prevents PATH injection attacks for sudo

The most critical part of this output is this part:-

```bash
User postgres may run the following commands on vaccine:
    (ALL) /bin/vi /etc/postgresql/11/main/pg_hba.conf
```

In this example user can execute these executables including vi (escalation path)
