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
