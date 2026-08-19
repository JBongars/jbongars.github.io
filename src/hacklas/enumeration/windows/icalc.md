# icacls

**Author:** Julien Bongars\
**Date:** 2026-01-05 02:47:47
**Path:**

---

View and change NTFS ACLs on Windows files and folders.

## List permissions

```powershell
# Current directory
icacls .

# Specific directory
icacls C:\Windows

# Specific file
icacls C:\path\to\file.txt
```

```txt
C:\htb> icacls c:\windows
c:\windows NT SERVICE\TrustedInstaller:(F)
           NT SERVICE\TrustedInstaller:(CI)(IO)(F)
           NT AUTHORITY\SYSTEM:(M)
           NT AUTHORITY\SYSTEM:(OI)(CI)(IO)(F)
           BUILTIN\Administrators:(M)
           BUILTIN\Administrators:(OI)(CI)(IO)(F)
           BUILTIN\Users:(RX)
           BUILTIN\Users:(OI)(CI)(IO)(GR,GE)
           CREATOR OWNER:(OI)(CI)(IO)(F)
           APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES:(RX)
           APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES:(OI)(CI)(IO)(GR,GE)
           APPLICATION PACKAGE AUTHORITY\ALL RESTRICTED APPLICATION PACKAGES:(RX)
           APPLICATION PACKAGE AUTHORITY\ALL RESTRICTED APPLICATION PACKAGES:(OI)(CI)(IO)(GR,GE)

Successfully processed 1 files; Failed processing 0 files
```

## Permission flags

### Inheritance

**(CI):** Container Inherit — subfolders inherit
**(OI):** Object Inherit — files inherit
**(IO):** Inherit Only — applies to children, not this object
**(NP):** No Propagate — don't propagate to children
**(I):** Permission inherited from parent

### Access rights

**F:** Full access
**M:** Modify access
**RX:** Read and execute
**R:** Read-only
**W:** Write-only
**D:** Delete access
**N:** No access

### Common combinations

**(OI)(CI)(F):** Full control, inherited by all files and subfolders
**(OI)(CI)(IO)(F):** Full control for children only, not this folder
**RX:** Read and execute, no inheritance specified

## Granting permissions

### Grant full control (no inheritance)

```powershell
# User gets full control ONLY on this folder, not contents
icacls C:\Users /grant joe:f
```

```txt
C:\htb> icacls c:\users /grant joe:f
processed file: c:\users
Successfully processed 1 files; Failed processing 0 files

C:\htb> icacls c:\users
c:\users WS01\joe:(F)
         NT AUTHORITY\SYSTEM:(OI)(CI)(F)
         BUILTIN\Administrators:(OI)(CI)(F)
         BUILTIN\Users:(RX)
         BUILTIN\Users:(OI)(CI)(IO)(GR,GE)
         Everyone:(RX)
         Everyone:(OI)(CI)(IO)(GR,GE)

Successfully processed 1 files; Failed processing 0 files
```

### Grant with inheritance

```powershell
# Full control on folder AND all contents
icacls C:\Users /grant joe:(OI)(CI)F

# Modify access with inheritance
icacls C:\Data /grant "DOMAIN\user":(OI)(CI)M

# Read-only with inheritance
icacls C:\Shared /grant Everyone:(OI)(CI)R
```

## Removing permissions

```powershell
# Remove all permissions for user
icacls C:\Users /remove joe

# Remove specific permission
icacls C:\Data /remove:g joe
```

## Pentest checks

### Weak permissions

```powershell
# Find directories where Users have write access
icacls C:\Program Files\* 2>nul | findstr /i "Users:.*F"
icacls C:\Program Files\* 2>nul | findstr /i "Users:.*M"
icacls C:\Program Files\* 2>nul | findstr /i "Everyone:.*F"

# Check service binary permissions
icacls "C:\Program Files\VulnerableApp\service.exe"
```

### Current user

```powershell
# See what access current user has
icacls C:\sensitive\file.txt | findstr /i "%username%"
```

### Writable directories

```powershell
# Find folders you can write to
icacls C:\* 2>nul | findstr /i "%username%:(F)" 
icacls C:\* 2>nul | findstr /i "%username%:(M)"
icacls C:\* 2>nul | findstr /i "BUILTIN\Users:(F)"
```

## Privilege escalation checks

### Unquoted service paths with weak folder permissions

```powershell
# Check if you can write to Program Files
icacls "C:\Program Files\Vulnerable App\"

# If (F) or (M), you can place malicious binary in path
```

### DLL hijacking

```powershell
# Check application directory permissions
icacls "C:\Program Files\TargetApp\"

# If writable, can drop malicious DLL
```

### AlwaysInstallElevated + MSI write access

```powershell
# Check if you can write MSI to accessible location
icacls C:\Temp
icacls C:\Users\Public
```

## Advanced usage

### Save current permissions

```powershell
# Backup permissions before modifying
icacls C:\Important /save perms.txt /t
```

### Restore permissions

```powershell
icacls C:\ /restore perms.txt
```

### Reset to defaults

```powershell
# Reset to inherited permissions
icacls C:\folder /reset /t
```

### Deny permissions

```powershell
# Explicitly deny access (overrides allow)
icacls C:\Restricted /deny joe:(OI)(CI)F
```

### Take ownership

```powershell
# Must be admin or have SeRestorePrivilege
icacls C:\file.txt /setowner "NT AUTHORITY\SYSTEM"
```

## Quick reference

```powershell
# View permissions
icacls <path>

# Grant full control with inheritance
icacls <path> /grant <user>:(OI)(CI)F

# Grant modify with inheritance  
icacls <path> /grant <user>:(OI)(CI)M

# Remove permissions
icacls <path> /remove <user>

# Deny access
icacls <path> /deny <user>:(OI)(CI)F

# Reset to inherited
icacls <path> /reset

# Set owner
icacls <path> /setowner <user>
```

`(F)` alone applies only to the folder itself. Use `2>nul` to hide Access Denied during enum. `Everyone` / `BUILTIN\Users` with `(F)` or `(M)` is a red flag. Check service binaries, app folders, and scheduled-task executables. PowerShell alternative: `Get-Acl` / `Set-Acl`.

## Resources

- [Microsoft icacls](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/icacls) — flags, inheritance, and examples
