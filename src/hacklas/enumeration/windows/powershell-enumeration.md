# powershell

**Author:** Julien Bongars\
**Date:** 2026-01-04 17:38:31
**Path:**

---

## System Information

### Get most fields from Computer

```powershell
Get-ComputerInfo
```

### Get Build Number

```powershell
Get-WmiObject -Class win32_OperatingSystem | select Version,BuildNumber
```

### System Info (CMD)

```cmd
systeminfo
```

### OS Version

```powershell
[System.Environment]::OSVersion.Version
```

### NT-Version

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

### Full Network Configuration

```cmd
ipconfig /all
```

### Network Adapters

```powershell
Get-NetIPAddress
Get-NetAdapter
```

### Routing Table

```cmd
route print
```

### ARP Cache

```cmd
arp -a
```

### Active Connections

```cmd
netstat -ano
```

### Firewall Status

```powershell
netsh advfirewall show allprofiles
```

### DNS Cache

```cmd
ipconfig /displaydns
```

## Users and Groups

### Current User

```cmd
whoami
echo %username%
```

### User Privileges

```cmd
whoami /priv
whoami /groups
```

### All Local Users

```cmd
net user
```

### Specific User Info

```cmd
net user username
```

### Local Groups

```cmd
net localgroup
```

### Administrators Group

```cmd
net localgroup administrators
```

### Domain Users (if domain joined)

```cmd
net user /domain
```

### Logged On Users

```cmd
query user
qwinsta
```

## Processes and Services

### Running Processes

```cmd
tasklist
tasklist /svc
```

### Process Details

```powershell
Get-Process
Get-Process | select ProcessName,Id,Path
```

### Services

```cmd
net start
sc query
```

### Service Details

```powershell
Get-Service
Get-Service | where {$_.Status -eq "Running"}
```

### Scheduled Tasks

```cmd
schtasks /query /fo LIST /v
```

```powershell
Get-ScheduledTask
```

## Installed Software

### Installed Programs (Registry)

```powershell
Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | select DisplayName, DisplayVersion, Publisher, InstallDate
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | select DisplayName, DisplayVersion, Publisher, InstallDate
```

### Using WMIC

```cmd
wmic product get name,version
```

## File System

### Search for Files

```cmd
dir /s /b C:\*password*.txt
dir /s /b C:\*config*.xml
```

### Recent Files

```powershell
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\Recent\
```

### Interesting Directories

```cmd
dir C:\
dir C:\Users
dir C:\Program Files
dir C:\inetpub
```

### Find Writable Directories

```powershell
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.PSIsContainer -and (Get-Acl $_.FullName).Access | Where-Object {$_.FileSystemRights -match "Write" -and $_.IdentityReference -match "Users"}}
```

## Security and Patches

### Windows Updates

```powershell
Get-HotFix
```

### Specific Update

```cmd
wmic qfe get Caption,Description,HotFixID,InstalledOn
```

### Antivirus Status

```powershell
Get-MpComputerStatus
```

### Windows Defender Exclusions

```powershell
Get-MpPreference | select ExclusionPath, ExclusionExtension
```

### UAC Status

```cmd
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
```

## Credentials and Sensitive Data

### Saved Credentials

```cmd
cmdkey /list
```

### WiFi Passwords

```cmd
netsh wlan show profiles
netsh wlan show profile name="PROFILE_NAME" key=clear
```

### Search for Credentials in Files

```cmd
findstr /si password *.txt *.xml *.config *.ini
findstr /si username *.txt *.xml *.config *.ini
```

### PowerShell History

```powershell
Get-Content (Get-PSReadlineOption).HistorySavePath
```

### Registry AutoLogon

```cmd
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

## Shares and Drives

### Network Shares

```cmd
net share
```

### Mounted Drives

```cmd
wmic logicaldisk get caption,description,providername
```

### Accessible Shares

```cmd
net view \\localhost
net view \\computername
```

## Additional Commands

### Environment Variables

```cmd
set
```

```powershell
Get-ChildItem Env:
```

### Startup Programs

```cmd
wmic startup get caption,command
```

### Drivers

```powershell
driverquery
```

### Event Logs (Recent)

```powershell
Get-EventLog -LogName System -Newest 100
Get-EventLog -LogName Security -Newest 100
```

## PowerShell-Specific

### Execution Policy

```powershell
Get-ExecutionPolicy
```

### PowerShell Version

```powershell
$PSVersionTable
```

### Module Listing

```powershell
Get-Module -ListAvailable
```

## Quick Win Checks

### Check for Unquoted Service Paths

```cmd
wmic service get name,pathname,displayname,startmode | findstr /i auto | findstr /i /v "C:\Windows\\" | findstr /i /v """
```

### AlwaysInstallElevated

```cmd
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

### Weak Service Permissions

```powershell
Get-Acl HKLM:\System\CurrentControlSet\Services\* | Format-List
```
