# Run Utilities

**Author:** Julien Bongars\
**Date:** 2026-01-05 03:33:53
**Path:**

---

## Administrative Tools - GUI Utilities

### Path: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Administrative Tools`

| Description                       | Command (Win+R)                    | PowerShell Alternative                         |
| --------------------------------- | ---------------------------------- | ---------------------------------------------- |
| Component Services                | `comexp.msc` or `dcomcnfg`         | N/A                                            |
| Computer Management               | `compmgmt.msc`                     | `Get-ComputerInfo`, `Get-Disk`, `Get-Service`  |
| Defragment and Optimize Drives    | `dfrgui`                           | `Optimize-Volume -DriveLetter C -Defrag`       |
| Disk Cleanup                      | `cleanmgr`                         | `Clear-RecycleBin`, custom scripts             |
| Event Viewer                      | `eventvwr.msc`                     | `Get-EventLog`, `Get-WinEvent`                 |
| iSCSI Initiator                   | `iscsicpl`                         | `Get-IscsiTarget`, `Connect-IscsiTarget`       |
| Memory Diagnostics Tool           | `mdsched`                          | N/A (reboot required)                          |
| ODBC Data Sources (32-bit)        | `C:\Windows\SysWOW64\odbcad32.exe` | N/A                                            |
| ODBC Data Sources (64-bit)        | `odbcad32`                         | N/A                                            |
| Performance Monitor               | `perfmon.msc` or `perfmon`         | `Get-Counter`                                  |
| Print Management                  | `printmanagement.msc`              | `Get-Printer`, `Get-PrintJob`                  |
| Recovery Drive                    | `recoverydrive`                    | N/A                                            |
| Registry Editor                   | `regedit`                          | `Get-ItemProperty`, `Set-ItemProperty`         |
| Resource Monitor                  | `resmon`                           | `Get-Process`, `Get-NetTCPConnection`          |
| Security Configuration Management | `secpol.msc`                       | `Get-LocalSecurityPolicy` (limited)            |
| Services                          | `services.msc`                     | `Get-Service`, `Start-Service`, `Stop-Service` |
| System Configuration              | `msconfig`                         | N/A (boot config)                              |
| System Information                | `msinfo32`                         | `Get-ComputerInfo`, `systeminfo`               |
| Task Scheduler                    | `taskschd.msc`                     | `Get-ScheduledTask`, `New-ScheduledTask`       |
| Windows Defender Firewall         | `wf.msc`                           | `Get-NetFirewallRule`, `New-NetFirewallRule`   |

## Additional Common Administrative Tools

| Description            | Command (Win+R)    | PowerShell Alternative                       |
| ---------------------- | ------------------ | -------------------------------------------- |
| Local Users and Groups | `lusrmgr.msc`      | `Get-LocalUser`, `Get-LocalGroup`            |
| Disk Management        | `diskmgmt.msc`     | `Get-Disk`, `Get-Partition`, `Get-Volume`    |
| Device Manager         | `devmgmt.msc`      | `Get-PnpDevice`                              |
| Certificates           | `certmgr.msc`      | `Get-ChildItem Cert:\`                       |
| Local Security Policy  | `secpol.msc`       | Limited alternatives                         |
| Group Policy Editor    | `gpedit.msc`       | N/A (Pro/Enterprise only)                    |
| Shared Folders         | `fsmgmt.msc`       | `Get-SmbShare`, `Get-SmbSession`             |
| Windows Features       | `optionalfeatures` | `Get-WindowsOptionalFeature`                 |
| Programs and Features  | `appwiz.cpl`       | `Get-Package`, `Get-WmiObject Win32_Product` |

## Control Panel Items (.cpl)

| Description         | Command (Win+R)               |
| ------------------- | ----------------------------- |
| Add/Remove Programs | `appwiz.cpl`                  |
| Date and Time       | `timedate.cpl`                |
| Display Settings    | `desk.cpl`                    |
| Firewall            | `firewall.cpl`                |
| Internet Properties | `inetcpl.cpl`                 |
| Keyboard Properties | `main.cpl keyboard`           |
| Mouse Properties    | `main.cpl`                    |
| Network Connections | `ncpa.cpl`                    |
| Power Options       | `powercfg.cpl`                |
| Sound               | `mmsys.cpl`                   |
| System Properties   | `sysdm.cpl`                   |
| User Accounts       | `userpasswords` or `netplwiz` |

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
