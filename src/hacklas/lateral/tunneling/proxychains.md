# proxychains

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

Force TCP-using tools through a SOCKS proxy (chisel `R:socks`, `ssh -D`, ligolo listener, etc.) so you can reach a host that is only visible from the pivot.

## Config

`/etc/proxychains4.conf` (or `proxychains.conf`):

```txt
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 1080
```

## Usage

```bash
proxychains nmap -sT -Pn --top-ports 1000 172.16.1.0/24
proxychains curl http://172.16.1.10
proxychains nxc smb 172.16.1.10 -u user -p 'Pass'
proxychains xfreerdp /v:172.16.1.20 /u:admin /p:pass
```

Must use **TCP connect** (`nmap -sT`). SYN scans and ping/ICMP do not go through SOCKS.

One-off config:

```bash
proxychains4 -f /tmp/pc.conf nmap -sT -Pn 172.16.1.10
```

## Resources

- [haad/proxychains](https://github.com/haad/proxychains) — original
- [proxychains-ng](https://github.com/rofl0r/proxychains-ng) — the `proxychains4` package on Kali
- [chisel](./chisel.md) — typical SOCKS producer (`R:socks`)
- [ligolo-ng](./ligolo-ng.md) — TUN pivot (often no proxychains needed)
- [SSH tunneling](./port-forwarding.md) — `ssh -D 1080`
