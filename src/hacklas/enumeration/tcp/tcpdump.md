# tcpdump

**Author:** Julien Bongars\
**Date:** 2025-09-25 00:08:51
**Path:**

---

Capture packets on the wire: filter by host, port, or protocol; write a pcap or print payloads.

## Basic Usage

```bash
# Capture all traffic
sudo tcpdump

# Capture on specific interface
sudo tcpdump -i eth0

# Capture 10 packets and stop
sudo tcpdump -c 10

# Save to file
sudo tcpdump -w capture.pcap

# Read from file
tcpdump -r capture.pcap
```

## Common Filters

```bash
# Specific host
sudo tcpdump host 192.168.1.100

# Specific port
sudo tcpdump port 80

# Protocol
sudo tcpdump tcp
sudo tcpdump udp

# Combinations
sudo tcpdump host 192.168.1.100 and port 80
sudo tcpdump port 80 or port 443
```

## Useful for Pentesting

```bash
# Monitor reverse shell connections
sudo tcpdump dst port 4444

# Watch for LDAP callbacks (Log4Shell)
sudo tcpdump port 1389

# HTTP traffic with content
sudo tcpdump -A port 80

# DNS queries
sudo tcpdump port 53
```

## Output Options

```bash
# Show packet content as text
sudo tcpdump -A

# More details
sudo tcpdump -v

# No hostname resolution (faster)
sudo tcpdump -n
```

## Resources

- [tcpdump man page](https://www.tcpdump.org/manpages/tcpdump.1.html) — filters and flags
- [cheat.sh/tcpdump](https://cheat.sh/tcpdump) — extra capture recipes
