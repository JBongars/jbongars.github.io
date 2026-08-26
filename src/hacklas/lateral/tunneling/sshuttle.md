---
note_tags:
  - ssh
  - pivot
  - vpn
  - cidr
---
# sshuttle

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

Transparent VPN-ish proxy over SSH. Unlike [proxychains](./proxychains.md), you do **not** prefix every command — `sshuttle` NATs whole CIDRs through the bastion (needs root / `pfctl` on macOS).

HackTricks: [Tunneling and Port Forwarding](https://book.hacktricks.xyz/generic-methodologies-and-resources/tunneling-and-port-forwarding) (SSHUTTLE section). Per-port / SOCKS: [SSH tunneling](./port-forwarding.md), [chisel](./chisel.md). Full TUN: [ligolo-ng](./ligolo-ng.md).

ICMP and SYN scans do not go through this (or SOCKS). Use `-Pn -sT`.

## Lab / HTB

```bash
pip install sshuttle
# or: brew install sshuttle

sshuttle -r user@host 10.10.10.0/24
sudo sshuttle -r user@BASTION 10.10.10.0/24 -v
```

Private key / daemon (from HackTricks):

```bash
sshuttle -D -r user@host 10.10.10.0/24 0/0 --ssh-cmd 'ssh -i ./id_rsa'
# -D : daemon
```

Then nmap / browser / rdp as if you were on that net. UDP/ICMP still will not go through.

## Staging bastion (macOS + AWS)

```bash
#!/bin/bash

# Check if sshuttle and pfctl are installed on mac
if [ -z "$(which sshuttle)" -o -z "$(which pfctl)" ] ; then
    echo "Error: sshuttle or pfctl not installed"
    echo "---"
    echo "Documentation: https://sshuttle.readthedocs.io/en/stable/requirements.html"
    echo "Mac Install:"
    echo "brew install sshuttle"
    exit 1
fi

# Check if AWS CLI is installed
if [ -z "$(which aws)" ] ; then
    echo "Error: AWS CLI not installed"
    exit 1
fi

# Get ec2 instance ipv4 address that is bastion-staging
BASTION_ADDRESS="$(aws ec2 describe-instances --filters "Name=tag:Name,Values=bastion-staging" --query 'Reservations[*].Instances[*].PublicIpAddress' --output text)"

if [ -z "$BASTION_ADDRESS" ] ; then
    echo "Error: Bastion not found! Check AWS"
    exit 1
fi

echo "Staging bastion address: $BASTION_ADDRESS"
echo "Forwarding traffic to 10.0.0.0/14 and 172.16.0.0/12"

# Add SSH keys
ssh-add ~/.ssh/stagging-bastion.pem
ssh-add ~/.ssh/dev-2024.pem

# Establish NAT network connection
set -x
sshuttle -r "ec2-user@$BASTION_ADDRESS" 10.0.0.0/14 172.16.0.0/12 -v
```

## Resources

- [HackTricks — Tunneling and Port Forwarding](https://book.hacktricks.xyz/generic-methodologies-and-resources/tunneling-and-port-forwarding) — SSHUTTLE (`-r`, `--ssh-cmd`, `-D`)
- [sshuttle docs](https://sshuttle.readthedocs.io/en/stable/) — install / how it NATs
- [sshuttle requirements](https://sshuttle.readthedocs.io/en/stable/requirements.html) — cited in the script
- [proxychains](./proxychains.md) — per-command SOCKS instead of NAT
- [SSH tunneling](./port-forwarding.md) — `-L` / `-D` when you only need a few ports
- [chisel](./chisel.md) — HTTP tunnel
- [ligolo-ng](./ligolo-ng.md) — TUN pivot
