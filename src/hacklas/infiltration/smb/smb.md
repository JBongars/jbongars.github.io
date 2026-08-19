# smb

**Author:** Julien Bongars\
**Date:** 2026-01-05 03:13:46
**Path:**

---

List, mount, and transfer over SMB/CIFS (445/TCP, 139/TCP).

## Linux client — smbclient

### List shares (enumeration)

```bash
# List shares on target
smbclient -L //SERVER_IP -U htb-student
# Null session (no creds)
smbclient -L //SERVER_IP -N  

# List with password prompt
smbclient -L //SERVER_IP -U username

# List with specific domain
smbclient -L //SERVER_IP -U DOMAIN/username
```

### Connect to share (interactive)

```bash
# Connect to specific share
smbclient '//SERVER_IP/Company Data' -U htb-student

# Connect with null session
smbclient '//SERVER_IP/Share' -N

# Common shares to check
smbclient '//SERVER_IP/C$' -U administrator     # C: drive (admin share)
smbclient '//SERVER_IP/ADMIN$' -U administrator # Windows directory
smbclient '//SERVER_IP/IPC$' -N                 # Null session enum
```

### Interactive commands (once connected)

```bash
smb: \> ls                    # List files
smb: \> cd folder             # Change directory
smb: \> get file.txt          # Download file
smb: \> mget *.txt            # Download multiple files
smb: \> put localfile.txt     # Upload file
smb: \> mput *.txt            # Upload multiple files
smb: \> mkdir newfolder       # Create directory
smb: \> rm file.txt           # Delete file
smb: \> help                  # Show commands
smb: \> exit                  # Quit
```

### Non-interactive (download)

```bash
# Download specific file
smbclient '//SERVER_IP/Share' -U user -c 'get file.txt'

# Download all files in directory
smbclient '//SERVER_IP/Share' -U user -c 'prompt OFF;recurse ON;mget *'

# Download with credentials in command
smbclient '//SERVER_IP/Share' -U user%password -c 'get file.txt'
```

## Mount SMB share to Linux

```bash
# Basic mount
sudo mount -t cifs -o username=htb-student,password=Academy_WinFun! //SERVER_IP/"Company Data" /mnt/smb

# Mount with specific user and domain
sudo mount -t cifs -o username=htb-student,password=Academy_WinFun!,domain=HTB //SERVER_IP/Share /mnt/smb

# Mount with credentials file (more secure)
echo "username=htb-student" > ~/.smbcreds
echo "password=Academy_WinFun!" >> ~/.smbcreds
chmod 600 ~/.smbcreds
sudo mount -t cifs -o credentials=~/.smbcreds //SERVER_IP/Share /mnt/smb

# Mount with specific UID/GID (so your user owns files)
sudo mount -t cifs -o username=user,password=pass,uid=$(id -u),gid=$(id -g) //SERVER_IP/Share /mnt/smb

# Unmount when done
sudo umount /mnt/smb
```

## Windows PowerShell — SMB shares

### List available shares (local)

```powershell
# List all SMB shares on local machine
Get-SmbShare

# Example output:
# Name   ScopeName Path                      Description
# ----   --------- ----                      -----------
# ADMIN$ *         C:\Windows                Remote Admin
# C$     *         C:\                       Default share
# IPC$   *                                   Remote IPC
```

### Create new share

```powershell
# Share a directory
New-SmbShare -Name "ShareName" -Path "C:\Path\To\Share" -FullAccess "Everyone"

# Share with specific permissions
New-SmbShare -Name "CompanyData" -Path "C:\Data" -ReadAccess "DOMAIN\Users" -FullAccess "DOMAIN\Admins"

# Share with description
New-SmbShare -Name "Backup" -Path "C:\Backups" -Description "Backup files" -FullAccess "Administrators"
```

### Remove share

```powershell
# Remove SMB share
Remove-SmbShare -Name "ShareName" -Force
```

### Access remote shares

```powershell
# Map network drive (persistent)
New-PSDrive -Name "Z" -PSProvider FileSystem -Root "\\SERVER\Share" -Persist

# Map with credentials
$cred = Get-Credential
New-PSDrive -Name "Z" -PSProvider FileSystem -Root "\\SERVER\Share" -Credential $cred -Persist

# Access share directly (temporary)
cd \\SERVER\Share

# List files on remote share
Get-ChildItem \\SERVER\Share

# Remove mapped drive
Remove-PSDrive -Name "Z"
```

### Net use (CMD/PowerShell — legacy but useful)

```powershell
# Map drive
net use Z: \\SERVER\Share /user:DOMAIN\username password

# Map with prompt for password
net use Z: \\SERVER\Share /user:username *

# View current mappings
net use

# Disconnect drive
net use Z: /delete

# Disconnect all
net use * /delete
```

## File transfer

### Linux to Windows (via SMB)

```bash
# Setup: First mount the Windows share on Linux
sudo mount -t cifs -o username=user,password=pass //WINDOWS_IP/C$ /mnt/smb

# Transfer file
cp /path/to/file.txt /mnt/smb/Users/Public/

# Or using smbclient
smbclient '//WINDOWS_IP/C$' -U user -c 'cd Users\Public; put file.txt'
```

### Windows to Linux (via SMB)

```bash
# Setup: Create SMB share on Linux (using Impacket)
impacket-smbserver share /tmp/smb -smb2support -username user -password pass

# OR using built-in Samba
# Edit /etc/samba/smb.conf and add:
# [share]
#   path = /tmp/smb
#   writable = yes
#   guest ok = yes
sudo systemctl restart smbd
```

```powershell
# From Windows, connect to Linux SMB
net use Z: \\LINUX_IP\share /user:user pass

# Copy file
copy C:\file.txt Z:\

# Or directly
copy C:\file.txt \\LINUX_IP\share\
```

### PowerShell file transfer via SMB

```powershell
# Copy file to remote share
Copy-Item "C:\local\file.txt" "\\SERVER\Share\file.txt"

# Copy entire directory
Copy-Item "C:\local\folder" "\\SERVER\Share\" -Recurse

# Download from share
Copy-Item "\\SERVER\Share\file.txt" "C:\local\file.txt"

# With credentials
$cred = Get-Credential
New-PSDrive -Name "Temp" -PSProvider FileSystem -Root "\\SERVER\Share" -Credential $cred
Copy-Item "C:\file.txt" "Temp:\file.txt"
Remove-PSDrive -Name "Temp"
```

## Enumeration

### Linux — enumerate SMB

```bash
# Nmap SMB scripts
nmap -p 445 --script smb-enum-shares,smb-enum-users TARGET_IP
nmap -p 445 --script smb-os-discovery TARGET_IP
nmap -p 445 --script smb-vuln* TARGET_IP

# Enum4linux
enum4linux -a TARGET_IP
enum4linux -U TARGET_IP  # Users
enum4linux -S TARGET_IP  # Shares

# CrackMapExec
crackmapexec smb TARGET_IP
crackmapexec smb TARGET_IP -u '' -p ''  # Null session
crackmapexec smb TARGET_IP -u user -p pass --shares
crackmapexec smb TARGET_IP -u user -p pass --sam  # Dump SAM

# SMBMap
smbmap -H TARGET_IP
smbmap -H TARGET_IP -u user -p pass
smbmap -H TARGET_IP -u user -p pass -r  # Recursive listing
```

### PowerShell — enumerate local/remote

```powershell
# List local shares
Get-SmbShare

# List share permissions
Get-SmbShareAccess -Name "ShareName"

# List SMB sessions (who's connected)
Get-SmbSession

# List open files on shares
Get-SmbOpenFile

# Test connection to remote SMB
Test-NetConnection -ComputerName SERVER -Port 445

# List shares on remote computer (requires admin)
Get-SmbShare -CimSession SERVER
```

### Computer Management (comptmgmt.msc)

- Computer Management -> Shared Folder -> Shares/Sessions

### Event Viewer (eventvwr.msc)

- Event Viewer ->

## Common pentesting scenarios

### Null session enumeration

```bash
# Try null authentication
smbclient -L //TARGET_IP -N
enum4linux -a TARGET_IP
smbmap -H TARGET_IP -u '' -p ''
```

### Password spraying

```bash
# CrackMapExec
crackmapexec smb TARGET_IP -u users.txt -p 'Password123!' --continue-on-success

# Spray with common passwords
crackmapexec smb TARGET_IP -u users.txt -p passwords.txt
```

### Check for EternalBlue

```bash
nmap -p 445 --script smb-vuln-ms17-010 TARGET_IP
```

### Access admin shares (C$, ADMIN$)

```bash
# Requires local admin creds
smbclient '//TARGET_IP/C$' -U administrator
smbclient '//TARGET_IP/ADMIN$' -U administrator
```

```powershell
# From Windows
net use Z: \\TARGET\C$ /user:administrator password
dir Z:\Users
```

## Tips

- Port 445 (SMB), port 139 (NetBIOS/SMB)
- Try null sessions first (`-N` flag)
- Common shares: `C$`, `ADMIN$`, `IPC$`, `SYSVOL`, `NETLOGON`
- Always check share permissions with `smbmap` or `smbclient`
- Use `Impacket-smbserver` for quick file exfil to your machine
- PowerShell `New-PSDrive` is cleaner than `net use`
- SMB signing disabled = relay attack possible
- Guest access enabled = potential anonymous enum

## Resources

- [Impacket](https://github.com/SecureAuthCorp/impacket) — `impacket-smbserver` and related tools
- [smbclient(1)](https://www.samba.org/samba/docs/current/man-html/smbclient.1.html) — Samba client flags
