# powershell-scripting

**Author:** Julien Bongars\
**Date:** 2026-01-05 01:37:38
**Path:**

---

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
