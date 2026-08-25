# SMB enumeration

**Author:** Julien Bongars\
**Date:** 2026-03-22 16:42:51
**Path:** `/home/julien/.hacklas/notes/enumeration/windows/smb.md`

---

TCP 445 (and 139). Order: unauth → guest → found creds → shares → files → relay if signing is off.

Linux client commands (smbclient, mount, Impacket) live in [SMB client](../../infiltration/smb/smb.md). This page is **how to find what is there**.

## 0. Version / signing / SMBv1

```bash
nmap -p 139,445 -sV --script smb-protocols,smb2-security-mode,smb-os-discovery TARGET
nxc smb TARGET
# Look at: (signing:True/False) (SMBv1:True/False) OS / hostname / domain
```

Signing **False** → NTLM relay later. SMBv1 → extra vulns (EternalBlue on old builds).

## 1. No creds (null / guest)

```bash
# Null session
nxc smb TARGET -u '' -p ''
smbclient -L //TARGET -N
smbmap -H TARGET
enum4linux-ng -A TARGET
rpcclient -U '' -N TARGET   # then: enumdomusers, srvinfo, querydominfo

# Guest
nxc smb TARGET -u 'guest' -p ''
smbclient -L //TARGET -U guest%
```

What you want from this: share list, domain name, OS, sometimes users (`--rid-brute` / `enumdomusers`).

```bash
nxc smb TARGET -u '' -p '' --shares
nxc smb TARGET -u '' -p '' --users
nxc smb TARGET -u '' -p '' --rid-brute
nxc smb TARGET --users   # SAMR user enum if allowed
```

## 2. With creds (the usual HTB case)

```bash
nxc smb DC01.tombwatcher.htb -u henry -p 'H3nry_987TGV! --shares'

# output
┌─[julien@parrot]─[~/.hacklas/targets/track-oscp/Tombwatcher]
└──╼ $ nxc smb DC01.tombwatcher.htb -u henry -p 'H3nry_987TGV!' --shares
SMB         10.129.232.167  445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:tombwatcher.htb) (signing:True) (SMBv1:False)
SMB         10.129.232.167  445    DC01             [+] tombwatcher.htb\henry:H3nry_987TGV!
SMB         10.129.232.167  445    DC01             [*] Enumerated shares
SMB         10.129.232.167  445    DC01             Share           Permissions     Remark
SMB         10.129.232.167  445    DC01             -----           -----------     ------
SMB         10.129.232.167  445    DC01             ADMIN$                          Remote Admin
SMB         10.129.232.167  445    DC01             C$                              Default share
SMB         10.129.232.167  445    DC01             IPC$            READ            Remote IPC
SMB         10.129.232.167  445    DC01             NETLOGON        READ            Logon server share
SMB         10.129.232.167  445    DC01             SYSVOL          READ            Logon server share
```

Same creds, more modules:

```bash
nxc smb TARGET -u USER -p PASS --shares
nxc smb TARGET -u USER -p PASS --users
nxc smb TARGET -u USER -p PASS --groups
nxc smb TARGET -u USER -p PASS --pass-pol
nxc smb TARGET -u USER -p PASS --sessions
nxc smb TARGET -u USER -p PASS --loggedon-users
nxc smb TARGET -u USER -p PASS --disks
nxc smb TARGET -u USER -p PASS -M spider_plus   # crawl readable shares
nxc smb TARGET -u USER -p PASS --get-file SHARE\\path\\file.txt ./file.txt
```

Local vs domain: `-d .` or `-d DOMAIN`. Spray: [nxc](../../infiltration/password_spray/nxc.md).

## 3. Shares that matter

- `IPC$` — named pipes / RPC, not files
- `ADMIN$` / `C$` — need local admin
- `NETLOGON` / `SYSVOL` — DC; GPP XML, scripts, often passwords (`Groups.xml`, `unattend`, `.ps1`)
- Custom shares — treat as a webroot: configs, backups, `*.kdbx`, `*.config`

```bash
smbmap -H TARGET -u USER -p PASS -R SHARE
smbclient //TARGET/SYSVOL -U 'DOMAIN/USER%PASS'
# recurse: recurse ON, prompt OFF, mget *
```

## 4. Users without LDAP

```bash
lookupsid.py 'DOMAIN/USER:PASS'@TARGET
nxc smb TARGET -u USER -p PASS --rid-brute 10000
rpcclient -U 'USER%PASS' TARGET
rpcclient $> enumdomusers
rpcclient $> queryuser 0x1f4
```

## Resources

- [NetExec (nxc)](https://github.com/Pennyw0rth/NetExec) — SMB modules used above
- [HackTricks — SMB](https://book.hacktricks.xyz/network-services-pentesting/pentesting-smb) — protocol and misconfig notes
- [SMB client](../../infiltration/smb/smb.md) — smbclient / mount / Impacket from Linux
- [nxc password spray](../../infiltration/password_spray/nxc.md) — spraying the same syntax
- [Windows common utils](./common.md)
