---
note_tags:
  - recon
  - checklist
  - nmap
  - services
  - port-scan
  - smb
  - web
  - database
---
# Service Enumeration & Vulnerability Research Checklist

**Author:** Julien Bongars\
**Date:** 2026-02-09
**Path:**

---

## Step 0: Identify what's running

- [ ] `nmap -sC -sV -p- -oN alltcp.txt $ip`
- [ ] `nmap -sU -sV -sC --top-ports=20 -oN top20udp.txt $ip`
- [ ] Unknown service on a port? Try:
  - [ ] `nc -nv $ip $port` — see if it sends a banner
  - [ ] `curl http://$ip:$port` — might be HTTP on a non-standard port
  - [ ] Google: `port <number> service`
  - [ ] `nmap -sV --version-intensity 5 -p $port $ip` — more aggressive version detection

---

## Step 1: For each identified service + version

### searchsploit

- [ ] `searchsploit <service> <version>`
- [ ] `searchsploit <service>` (broader, in case version-specific search is too narrow)
- [ ] `searchsploit -m <id>` to mirror anything promising

### Google (copy and substitute)

```txt
SERVICE=<service>
VERSION=<version>

<service> <version> exploit
<service> <version> CVE
<service> <version> RCE
<service> <version> authenticated RCE
<service> <version> default credentials
<service> <version> pentest
<service> <version> hacktricks
<service> <version> privilege escalation
```

Run them in that order. `authenticated RCE` is for after you have creds.
`privilege escalation` is post-exploitation on the box.

- [ ] exploit / CVE / RCE (unauth first)
- [ ] authenticated RCE (once you have creds)
- [ ] default credentials
- [ ] pentest / hacktricks write-ups
- [ ] privilege escalation

### Reference pages

- [ ] HackTricks page for the service: `https://book.hacktricks.xyz` — search for service name
- [ ] HackTricks page for the port: Google `hacktricks <port>`
- [ ] Check if there's a dedicated `nmap` script: `ls /usr/share/nmap/scripts/ | grep <service>`

---

## Step 2: Default credentials & misconfigurations

- [ ] Google: `<service> default credentials`
- [ ] Google: `<service> default password`
- [ ] Check: `https://www.cirt.net/passwords` or `https://default-password.info`
- [ ] Try common combos: `admin:admin`, `admin:password`, `root:root`, `guest:guest`
- [ ] Anonymous/null access?
  - FTP: `anonymous:anonymous`
  - SMB: `smbclient -L //$ip -N`
  - SNMP: community string `public`
  - Redis: `redis-cli -h $ip` (no auth by default)
  - MongoDB: `mongosh $ip` (no auth by default)

---

## Step 3: Per-service enumeration

Read: [OSCP enumeration checklist](./external/oscp-enumeration-checklist.md) ([oncybersec](https://github.com/oncybersec/oscp-enumeration-cheat-sheet))

---

## Step 4: Unknown or unusual service

- [ ] Google: `port <number> service`
- [ ] Google: `<banner_text> exploit`
- [ ] Google: `<service_name> pentest`
- [ ] Google: `<service_name> hacktricks`
- [ ] `nmap -sV --version-all -p $port $ip`
- [ ] Try interacting manually: `nc -nv $ip $port`
- [ ] Try HTTP: `curl http://$ip:$port`

---

## General vulnerability research tips

- If searchsploit returns nothing, broaden the version (e.g. search `Apache 2.4` instead of `Apache 2.4.49`)
- If Google returns nothing for the exact version, try the major version
- Check GitHub for PoCs: `<CVE_number> github`
- ExploitDB mirror: `https://www.exploit-db.com`
- Always check if an exploit requires authentication — save those for after you find creds
- When you find creds anywhere, circle back and try them on EVERY service

## Resources

- [HackTricks](https://book.hacktricks.xyz) — search the service name or port
- [CIRT default passwords](https://www.cirt.net/passwords) — default credential lists
- [default-password.info](https://default-password.info) — default credential lists
- [OSCP enumeration cheat sheet](https://github.com/oncybersec/oscp-enumeration-cheat-sheet) — source linked from Step 3
- [local oscp-enumeration-checklist](./external/oscp-enumeration-checklist.md) — same sheet in this repo
- [Exploit-DB](https://www.exploit-db.com) — ExploitDB mirror mentioned in the tips
