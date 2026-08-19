# powershell

**Author:** Julien Bongars\
**Date:** 2026-01-04 17:38:31
**Path:**

---

Host, user, service, and credential enumeration from a Windows shell.

## System information

### Get most fields from computer

```powershell
Get-ComputerInfo
```

### Get build number

```powershell
Get-WmiObject -Class win32_OperatingSystem | select Version,BuildNumber
```

### System info (CMD)

```cmd
systeminfo
```

### OS version

```powershell
[System.Environment]::OSVersion.Version
```

### NT-version

```powershell
# Method 1
[System.Environment]::OSVersion.Version

# Method 2
(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentVersion

# Method 3
(Get-WmiObject Win32_OperatingSystem).Version
```

### Architecture

```powershell
wmic os get osarchitecture
```

### Hostname

```cmd
hostname
```

## Networking

### Full network configuration

```cmd
ipconfig /all
```

### Network adapters

```powershell
Get-NetIPAddress
Get-NetAdapter
```

### Routing table

```cmd
route print
```

### ARP cache

```cmd
arp -a
```

### Active connections

```cmd
netstat -ano
```

### Firewall status

```powershell
netsh advfirewall show allprofiles
```

### DNS cache

```cmd
ipconfig /displaydns
```

## Users and groups

### Current user

```cmd
whoami
echo %username%
```

### User privileges

```cmd
whoami /priv
whoami /groups
```

### All local users

```cmd
net user
```

### Specific user info

```cmd
net user username
```

### Local groups

```cmd
net localgroup
```

### Administrators group

```cmd
net localgroup administrators
```

### Domain users (if domain joined)

```cmd
net user /domain
```

### Logged on users

```cmd
query user
qwinsta
```

## Processes and services

### Running processes

```cmd
tasklist
tasklist /svc
```

### Process details

```powershell
Get-Process
Get-Process | select ProcessName,Id,Path
```

### Services

```cmd
net start
sc query
```

### Service details

```powershell
Get-Service
Get-Service | where {$_.Status -eq "Running"}
```

### Scheduled tasks

```cmd
schtasks /query /fo LIST /v
```

```powershell
Get-ScheduledTask
```

## Installed software

### Installed programs (registry)

```powershell
Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | select DisplayName, DisplayVersion, Publisher, InstallDate
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | select DisplayName, DisplayVersion, Publisher, InstallDate
```

### Using WMIC

```cmd
wmic product get name,version
```

## File system

### Search for files

```cmd
dir /s /b C:\*password*.txt
dir /s /b C:\*config*.xml
```

### Recent files

```powershell
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\Recent\
```

### Interesting directories

```cmd
dir C:\
dir C:\Users
dir C:\Program Files
dir C:\inetpub
```

### Find writable directories

```powershell
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.PSIsContainer -and (Get-Acl $_.FullName).Access | Where-Object {$_.FileSystemRights -match "Write" -and $_.IdentityReference -match "Users"}}
```

## Security and patches

### Windows updates

```powershell
Get-HotFix
```

### Specific update

```cmd
wmic qfe get Caption,Description,HotFixID,InstalledOn
```

### Antivirus status

```powershell
Get-MpComputerStatus
```

### Windows Defender exclusions

```powershell
Get-MpPreference | select ExclusionPath, ExclusionExtension
```

### UAC status

```cmd
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
```

## Credentials and sensitive data

### Saved credentials

```cmd
cmdkey /list
```

### WiFi passwords

```cmd
netsh wlan show profiles
netsh wlan show profile name="PROFILE_NAME" key=clear
```

### Search for credentials in files

```cmd
findstr /si password *.txt *.xml *.config *.ini
findstr /si username *.txt *.xml *.config *.ini
```

### PowerShell history

```powershell
Get-Content (Get-PSReadlineOption).HistorySavePath
```

### Registry AutoLogon

```cmd
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

## Shares and drives

### Network shares

```cmd
net share
```

### Mounted drives

```cmd
wmic logicaldisk get caption,description,providername
```

### Accessible shares

```cmd
net view \\localhost
net view \\computername
```

## Additional commands

### Environment variables

```cmd
set
```

```powershell
Get-ChildItem Env:
```

### Startup programs

```cmd
wmic startup get caption,command
```

### Drivers

```powershell
driverquery
```

### Event logs (recent)

```powershell
Get-EventLog -LogName System -Newest 100
Get-EventLog -LogName Security -Newest 100
```

## PowerShell-specific

### Execution policy

```powershell
Get-ExecutionPolicy
```

### PowerShell version

```powershell
$PSVersionTable
```

### Module listing

```powershell
Get-Module -ListAvailable
```

## Quick win checks

### Check for unquoted service paths

```cmd
wmic service get name,pathname,displayname,startmode | findstr /i auto | findstr /i /v "C:\Windows\\" | findstr /i /v """
```

### AlwaysInstallElevated

```cmd
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

### Weak service permissions

```powershell
Get-Acl HKLM:\System\CurrentControlSet\Services\* | Format-List
```

## Resources

- [Microsoft PowerShell](https://learn.microsoft.com/en-us/powershell/) — cmdlet reference
- [HackTricks — Windows local privilege escalation](https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation) — what to do with enum output
