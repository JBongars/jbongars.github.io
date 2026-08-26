---
note_tags:
  - windows
  - winrm
  - pivot
  - netsh
  - portproxy
  - powershell
---
# Windows pivot — WinRM first

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

You have a Windows foothold. **Do not start with SSH.** OpenSSH is optional on Windows; WinRM (5985) and RDP (3389) are the front door.

Order:

1. [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md) — turn the listener on, add the user to the right group
2. Connect: `evil-winrm` / `nxc winrm` / [xfreerdp](../../infiltration/windows/xfreerdp.md) (prefer Remmina if xfreerdp is flaky)
3. Pivot with [ligolo-ng](./ligolo-ng.md) or [chisel](./chisel.md) from that session
4. SSH last — only if WinRM/RDP are dead and OpenSSH is actually installed

## WinRM (the default)

```bash
evil-winrm -i TARGET -u USER -p 'PASS'
nxc winrm TARGET -u USER -p 'PASS'
```

From another Windows box:

```powershell
Enter-PSSession -ComputerName TARGET -Credential (Get-Credential)
```

Full enable/firewall/groups: [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md).

## RDP

[RDP](../../infiltration/windows/rdp.md) / [xfreerdp](../../infiltration/windows/xfreerdp.md). Drive share (`/drive:share,/tmp`) is enough to move files — you do not need an SSH tunnel for that.

## SSH on Windows (last resort)

Only if `Get-WindowsCapability` shows the client/server present. Same flags as Linux.

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
```

```powershell
# Same syntax as Linux
# Background (using PowerShell Start-Process)
Start-Process ssh -ArgumentList "-D 1080 user@pivot-host" -WindowStyle Hidden
```

Then [proxychains](./proxychains.md) on the attacker box against that SOCKS port — [SSH tunneling](./port-forwarding.md).

## Resources

- [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md) — listener + groups + firewall
- [RDP](../../infiltration/windows/rdp.md) — GUI session
- [xfreerdp](../../infiltration/windows/xfreerdp.md) — Linux client (`xfreerdp3`)
- [proxychains](./proxychains.md) — SOCKS consumer
- [SSH tunneling](./port-forwarding.md) — `-L` / `-R` / `-D`
- [ligolo-ng](./ligolo-ng.md) — TUN through the foothold
