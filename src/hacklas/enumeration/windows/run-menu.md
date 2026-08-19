# Run Utilities

**Author:** Julien Bongars\
**Date:** 2026-01-05 03:33:53
**Path:**

---

Win+R snap-ins and PowerShell equivalents for local Windows enum.

## Administrative Tools - GUI Utilities

Path: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Administrative Tools`

**`comexp.msc`** / **`dcomcnfg`** — Component Services

**`compmgmt.msc`** — Computer Management. PowerShell: `Get-ComputerInfo`, `Get-Disk`, `Get-Service`

**`dfrgui`** — Defragment and Optimize Drives. PowerShell: `Optimize-Volume -DriveLetter C -Defrag`

**`cleanmgr`** — Disk Cleanup. PowerShell: `Clear-RecycleBin`, custom scripts

**`eventvwr.msc`** — Event Viewer. PowerShell: `Get-EventLog`, `Get-WinEvent`

**`iscsicpl`** — iSCSI Initiator. PowerShell: `Get-IscsiTarget`, `Connect-IscsiTarget`

**`mdsched`** — Memory Diagnostics Tool (reboot required)

**`C:\Windows\SysWOW64\odbcad32.exe`** — ODBC Data Sources (32-bit)

**`odbcad32`** — ODBC Data Sources (64-bit)

**`perfmon.msc`** / **`perfmon`** — Performance Monitor. PowerShell: `Get-Counter`

**`printmanagement.msc`** — Print Management. PowerShell: `Get-Printer`, `Get-PrintJob`

**`recoverydrive`** — Recovery Drive

**`regedit`** — Registry Editor. PowerShell: `Get-ItemProperty`, `Set-ItemProperty`

**`resmon`** — Resource Monitor. PowerShell: `Get-Process`, `Get-NetTCPConnection`

**`secpol.msc`** — Security Configuration Management. PowerShell: `Get-LocalSecurityPolicy` (limited)

**`services.msc`** — Services. PowerShell: `Get-Service`, `Start-Service`, `Stop-Service`

**`msconfig`** — System Configuration (boot config)

**`msinfo32`** — System Information. PowerShell: `Get-ComputerInfo`, `systeminfo`

**`taskschd.msc`** — Task Scheduler. PowerShell: `Get-ScheduledTask`, `New-ScheduledTask`

**`wf.msc`** — Windows Defender Firewall. PowerShell: `Get-NetFirewallRule`, `New-NetFirewallRule`

## Additional Common Administrative Tools

**`lusrmgr.msc`** — Local Users and Groups. PowerShell: `Get-LocalUser`, `Get-LocalGroup`

**`diskmgmt.msc`** — Disk Management. PowerShell: `Get-Disk`, `Get-Partition`, `Get-Volume`

**`devmgmt.msc`** — Device Manager. PowerShell: `Get-PnpDevice`

**`certmgr.msc`** — Certificates. PowerShell: `Get-ChildItem Cert:\`

**`secpol.msc`** — Local Security Policy (limited alternatives)

**`gpedit.msc`** — Group Policy Editor (Pro/Enterprise only)

**`fsmgmt.msc`** — Shared Folders. PowerShell: `Get-SmbShare`, `Get-SmbSession`

**`optionalfeatures`** — Windows Features. PowerShell: `Get-WindowsOptionalFeature`

**`appwiz.cpl`** — Programs and Features. PowerShell: `Get-Package`, `Get-WmiObject Win32_Product`

## Control Panel Items (.cpl)

**`appwiz.cpl`** — Add/Remove Programs

**`timedate.cpl`** — Date and Time

**`desk.cpl`** — Display Settings

**`firewall.cpl`** — Firewall

**`inetcpl.cpl`** — Internet Properties

**`main.cpl keyboard`** — Keyboard Properties

**`main.cpl`** — Mouse Properties

**`ncpa.cpl`** — Network Connections

**`powercfg.cpl`** — Power Options

**`mmsys.cpl`** — Sound

**`sysdm.cpl`** — System Properties

**`userpasswords`** / **`netplwiz`** — User Accounts

## Quick Pentesting Reference

### Enumeration Commands (PowerShell Preferred)

```powershell
# Instead of lusrmgr.msc
Get-LocalUser
Get-LocalGroup
Get-LocalGroupMember Administrators

# Instead of services.msc
Get-Service
Get-Service | Where-Object {$_.Status -eq "Running"}

# Instead of taskschd.msc
Get-ScheduledTask
Get-ScheduledTask | Where-Object {$_.State -ne "Disabled"}

# Instead of eventvwr.msc
Get-EventLog -LogName Security -Newest 100
Get-WinEvent -LogName Security -MaxEvents 100

# Instead of compmgmt.msc (various)
Get-ComputerInfo
systeminfo
Get-Disk
Get-Volume

# Instead of perfmon
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Process | Sort-Object CPU -Descending

# Instead of regedit (for specific keys)
Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
Get-ChildItem HKLM:\SOFTWARE\

# Instead of wf.msc
Get-NetFirewallRule | Where-Object {$_.Enabled -eq "True"}
Get-NetFirewallProfile

# Instead of fsmgmt.msc
Get-SmbShare
Get-SmbSession
Get-SmbOpenFile
```

## Tips for Pentesting

- **Avoid GUI when possible** - Use PowerShell for speed and stealth
- **MMC snap-ins leave logs** - PowerShell commands may be less obvious
- **Services.msc → Get-Service** - Check for unquoted service paths, weak permissions
- **Task Scheduler → Get-ScheduledTask** - Look for scheduled tasks you can modify
- **Event Viewer → Get-WinEvent** - Check for failed login attempts, suspicious events
- **Registry Editor → PowerShell** - Search for credentials, auto-run keys
- **lusrmgr.msc → Get-LocalUser** - Enumerate users and group memberships

## Running Tools from Command Line

Many GUI tools can be launched from CMD/PowerShell:

```cmd
REM Launch as current user
eventvwr.msc
services.msc
compmgmt.msc

REM Some tools need full path
C:\Windows\System32\mmc.exe eventvwr.msc
```

```powershell
# Launch and continue (non-blocking)
Start-Process eventvwr.msc
Start-Process services.msc

# Launch as different user
Start-Process services.msc -Credential (Get-Credential)
```

## Resources

- [MMC](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/mmc) — snap-in launcher
- [Microsoft — Windows commands](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands) — `.msc` / `.cpl` names
