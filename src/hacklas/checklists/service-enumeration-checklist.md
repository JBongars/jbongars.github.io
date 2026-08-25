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

### Google searches (in this order)

- [ ] `<service> <version> exploit`
- [ ] `<service> <version> CVE`
- [ ] `<service> <version> RCE`
- [ ] `<service> <version> authenticated RCE` (for after you have creds)
- [ ] `<service> <version> default credentials`
- [ ] `<service> <version> pentest`
- [ ] `<service> <version> hacktricks`
- [ ] `<service> <version> privilege escalation` (for post-exploitation)

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

Read: ./external/oscp-enumeration-checklist.md (https://github.com/oncybersec/oscp-enumeration-cheat-sheet)

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
