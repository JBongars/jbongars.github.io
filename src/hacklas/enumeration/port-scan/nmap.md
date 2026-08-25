# nmap

**Author:** Julien Bongars  
**Date:** 2025-11-28 13:07:44
**Path:** 

---

# Description
Network Mapper. **The industry-standard network discovery and security auditing tool**. Determines what hosts are available, what services they're running, what OS, firewall/packet filters in use, and dozens of other characteristics.

# Install
```bash
# Debian/Ubuntu
sudo apt install nmap

# Arch
sudo pacman -S nmap

# macOS
brew install nmap

# From source
wget https://nmap.org/dist/nmap-7.94.tar.bz2
tar -xvjf nmap-7.94.tar.bz2
cd nmap-7.94
./configure && make && sudo make install
```

# Run

**One IP Address**
```bash
nmap -sC -sV -sS -T4 -p- -oN nmap.txt 10.129.192.27
nmap -sC -sV -sS -T4 -p '30000-31000' -oN nmap.txt 10.129.192.27
nmap -sC -sV -sS -T4 --top-port 2000 -oN nmap.txt 10.129.192.27
```

**Ip Range**
```bash
nmap -sC -sV -sS -oN --top-port 100 nmap.txt 10.1.0.0/16
```

**Full TCP scan with timing:**
```bash
nmap -p- -T4 --min-rate=1000 -oN nmap/full.txt 10.10.10.100
```

**UDP scan (top 100):**
```bash
sudo nmap -sU --top-ports 100 -oN nmap/udp.txt 10.10.10.100
```


# Common Flags / Options
```
-sS         TCP SYN scan (stealth, default with root)
-sT         TCP connect scan (default without root)
-sU         UDP scan
-sV         Service/version detection
-sC         Default script scan (equivalent to --script=default)
-O          OS detection
-A          Aggressive (OS, version, scripts, traceroute)
-Pn         Skip host discovery (no ping)
-p          Specify ports (-p 22,80 or -p 1-1000 or -p-)
-p-         Scan all 65535 ports
-F          Fast scan (top 100 ports)
-T<0-5>     Timing template (0=paranoid, 5=insane)
-oN         Normal output to file
-oX         XML output
-oG         Grepable output
-oA         Output in all formats
-v          Verbose (-vv for more)
-iL         Input from list of hosts
--open      Show only open ports
--top-ports Number of top ports to scan
--script    Run specific NSE scripts
--reason    Show reason for port state
-n          Never do DNS resolution
-6          Enable IPv6 scanning
```

# NSE Scripts (Nmap Scripting Engine)
```bash
# List all scripts
ls /usr/share/nmap/scripts/

# Run specific script
nmap --script <script-name> <target>

# Run multiple scripts
nmap --script "http-* and not http-brute" <target>
```

# Related Notes
[MOC - Reconnaissance](../0%20-%20MOCs/MOC%20-%20Reconnaissance.md)
[rustscan](rustscan.md)

# References
- https://nmap.org/book/man.html
- https://nmap.org/nsedoc/
- https://github.com/nmap/nmap
