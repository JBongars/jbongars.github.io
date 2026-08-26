---
note_tags:
  - pcap
  - network
  - filters
---
# Wireshark display filters

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

The filter bar in Wireshark (and `tshark -Y`) uses **display** filter syntax, not BPF. Capture filters (`-f` / dumpcap) are a smaller BPF language — see [tshark](./tshark-cmd.md).

## Host / IP

```txt
ip.addr == 10.10.14.5
ip.src == 10.10.14.5
ip.dst == 10.129.1.100
ip.src == 10.10.14.5 && ip.dst == 10.129.1.100
ipv6.addr == fe80::1
```

## TCP from an IP

```txt
tcp && ip.src == 10.10.14.5
tcp.flags.syn == 1 && tcp.flags.ack == 0 && ip.src == 10.10.14.5
tcp.port == 445
tcp.dstport == 443
tcp.stream eq 12
```

## Hostname / HTTP / DNS / TLS

```txt
http.host == "target.htb"
http.host contains "htb"
http.request.uri contains "login"
dns.qry.name contains "target"
tls.handshake.extensions_server_name == "target.htb"
tls.handshake.extensions_server_name contains "htb"
```

## Other useful

```txt
smb || smb2
ldap
http.request
dns.flags.response == 0
frame contains "password"
!(arp || stp)
```

## Localhost / port-forward / SOCKS

The browser or `proxychains` talks to **127.0.0.1**, not the remote IP. Capture **loopback** (`lo` on Linux, `lo0` on macOS, "Adapter for loopback" on Windows) or you will see nothing.

```bash
sudo tshark -i lo -f "tcp port 8080"
sudo tshark -i lo0 -f "tcp port 8080"   # macOS
```

Display filters once the packets are on loopback:

```txt
ip.addr == 127.0.0.1
tcp.port == 8080
http.host
```

Map the local port to how you forwarded it:

- `ssh -L 8080:internal:80` — HTTP is plaintext on `127.0.0.1:8080`. Filter `tcp.port == 8080`.
- `ssh -D 1080` / chisel `R:socks` / [proxychains](../../lateral/tunneling/proxychains.md) — you see **SOCKS** on `tcp.port == 1080`, then the inner HTTP after the SOCKS handshake. Follow the TCP stream on 1080, or capture on `lo` and filter `tcp.port == 1080`.
- ligolo TUN — traffic leaves on the `ligolo` interface, not loopback. Capture that iface instead.

```bash
tshark -i lo -Y 'tcp.port == 1080'
tshark -i lo -Y 'http.host contains "htb"'
```

Apply in the Wireshark filter box, or:

```bash
tshark -r capture.pcap -Y 'tcp && ip.src == 10.10.14.5'
tshark -r capture.pcap -Y 'http.host contains "target"'
tshark -r capture.pcap -Y 'dns.qry.name contains "htb"' -T fields -e dns.qry.name
```

## Resources

- [Wireshark display filter reference](https://www.wireshark.org/docs/dfref/) — field names
- [Display Filter Reference (wiki)](https://wiki.wireshark.org/DisplayFilters) — syntax
- [tshark](./tshark-cmd.md) — capture CLI (`-f` vs `-Y`)
- [proxychains](../../lateral/tunneling/proxychains.md) — SOCKS consumer
- [SSH tunneling](../../lateral/tunneling/port-forwarding.md) — `-L` / `-D`
