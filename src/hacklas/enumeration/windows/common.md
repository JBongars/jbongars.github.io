---
note_tags:
  - recon
  - living-off-the-land
  - sysinternals
---
# Windows common utils

**Author:** Julien Bongars\
**Date:** 2026-01-05 01:35:44
**Path:**

---

Hub for built-in and live Sysinternals tools. Detailed icacls flags live in [icacls](./icalc.md). Win+R snap-ins live in [Windows Run menu](./run-menu.md).

## List of Common commands

Integrity Control Access Control List (icacls). Full flags: [icacls](./icalc.md).

```ps1
icacls C:\windows
icacls C:\Program Files\* 2>nul | findstr /i "Users:.*F"
```

## Address of common core utils in Windows

No install — UNC path from a domain-joined or internet-capable Windows box:

```txt
\\live.sysinternals.com\tools
```

Useful binaries there: `PsExec.exe`, `Procmon.exe`, `Procdump.exe`, `Tcpview.exe`, `AccessChk.exe`, `Whoami.exe`, `PsLoggedon.exe`, `Handle.exe`, `Strings.exe`.

```cmd
\\live.sysinternals.com\tools\accesschk.exe -uwcqv "Authenticated Users" *
\\live.sysinternals.com\tools\procdump.exe -accepteula -ma lsass.exe C:\Temp\lsass.dmp
```

https://live.sysinternals.com/tools/

## See also

- [icacls](./icalc.md) — grant/remove/inheritance
- [Windows Run menu](./run-menu.md) — `compmgmt.msc`, `lusrmgr.msc`, …
- [PowerShell enumeration](./powershell-enumeration.md)
- [PowerShell keybindings](./powershell-keybindings.md)
- [SMB enumeration](./smb.md)
- [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md)

## Resources

- [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls) — Microsoft command reference
- [Sysinternals Live](https://live.sysinternals.com/tools/) — browser view of the UNC share
