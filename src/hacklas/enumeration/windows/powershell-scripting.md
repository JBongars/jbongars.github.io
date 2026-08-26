---
note_tags:
  - powershell
  - scripting
  - bypass
  - recon
---
# PowerShell scripting

**Author:** Julien Bongars\
**Date:** 2026-01-05 01:37:38
**Path:**

---

Enum cmdlets: [PowerShell enumeration](./powershell-enumeration.md). Tab / `Ctrl+Space` / help: [PowerShell keybindings](./powershell-keybindings.md).

Linux pipes **text**. PowerShell pipes **objects**. `grep explorer` has nothing to parse — you filter a property.

## Where-Object (`?`)

`?` is `Where-Object`. `$_` is the current object in the pipeline.

```powershell
# Linux: ps aux | grep explorer
Get-Process | Where-Object { $_.Name -eq "explorer" }
Get-Process | ? { $_.Name -eq "explorer" }
```

`-eq` equals, `-match` regex, `-like` wildcard (`*svc*`), `-gt` / `-lt` for numbers and dates.

Simplified syntax — no script block, no `$_`. Prefer this when you are filtering one property:

```powershell
Get-Process | Where-Object Name -eq "explorer"
Get-Process | ? Name -eq "explorer"
gsv | ? Status -eq Running
```

Use `{ }` when the test is more than one comparison:

```powershell
gsv | ? { $_.Status -eq "Running" -and $_.Name -like "*sql*" }
```

## Get-Member (`gm`)

You cannot "read the text" of an object. Ask it what fields exist, then filter those names:

```powershell
Get-Service | Get-Member
Get-Service | gm -MemberType Property
gsv | gm
```

Then: `gsv | ? PropertyName -eq "value"`. `select Name, Status` is `Select-Object`.

## Linux → PowerShell (no extra binaries)

```powershell
# find … -name '*pass*'
Get-ChildItem -Path C:\Users\ -Recurse -Filter *pass* -ErrorAction SilentlyContinue

# find files touched in the last 7 days
Get-ChildItem -Path C:\inetpub\wwwroot -Recurse | ? LastWriteTime -gt (Get-Date).AddDays(-7)

# grep -r connectionString *.config
Select-String -Path C:\inetpub\wwwroot\*.config -Pattern "connectionString"

# netstat -tlnp  |  :445
Get-NetTCPConnection -State Listen | ? LocalPort -eq 445
```

`gci` = `Get-ChildItem`, `sls` = `Select-String`. Long names first; aliases after it clicks.

## Aliases

### Categories

#### Scripting

? → Where-Object
% → ForEach-Object

#### Navigation & Files

cd → Set-Location
ls → Get-ChildItem
dir → Get-ChildItem
pwd → Get-Location
cat → Get-Content
cp → Copy-Item
mv → Move-Item
rm → Remove-Item

#### Objects & Filtering

? → Where-Object
% → ForEach-Object
select → Select-Object
sort → Sort-Object

#### Output

echo → Write-Output
write → Write-Output

#### Process Management

ps → Get-Process
kill → Stop-Process

#### Services

gsv → Get-Service

#### Searching

sls → Select-String (like grep!)

#### Help

man → Get-Help

### Examples

```ps1
# Verbose version:
Get-ChildItem -Path C:\ -Directory -Recurse -ErrorAction SilentlyContinue | 
    ForEach-Object { icacls $_.FullName 2>$null } | 
    Select-String -Pattern "Users:.*F"

# Aliased version:
gci C:\ -r -dir -EA SilentlyContinue | 
    % { icacls $_.FullName 2>$null } | 
    sls "Users:.*F"

# Even shorter:
ls C:\ -r -dir -EA 0 | % { icacls $_.FullName 2>$null } | sls "Users:.*F"


# Before
Get-LocalUser | Where-Object {$_.Enabled -eq $true} | Select-Object Name, LastLogon
Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object Name, DisplayName
Get-Process | Where-Object {$_.CPU -gt 100} | Sort-Object CPU -Descending

# After
Get-LocalUser | ? Enabled | select Name, LastLogon
gsv | ? {$_.Status -eq "Running"} | select Name, DisplayName
ps | ? {$_.CPU -gt 100} | sort CPU -Desc
```

## Resources

- [PowerShell aliases](https://learn.microsoft.com/en-us/powershell/scripting/learn/cmdlet/approved-verbs-for-windows-powershell-commands) — official verb/alias guidance
- [cheat.sh powershell](https://cheat.sh/powershell) — extra lookup
- [PowerShell enumeration](./powershell-enumeration.md) — host/user/share enum
- [PowerShell keybindings](./powershell-keybindings.md) — completion and `Get-Help`
- [Windows Run menu](./run-menu.md) — GUI snap-ins vs cmdlets
- [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md) — front-door session from a foothold

