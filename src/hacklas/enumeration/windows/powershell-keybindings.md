---
note_tags:
  - powershell
  - cheatsheet
  - readline
  - recon
  - utility
  - evil-winrm
---
# PowerShell keybindings and help

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

PSReadLine (default in Windows PowerShell 5+ and pwsh) is Emacs-ish on Windows consoles. These are the ones that matter on a target.

Linux is text streams. PowerShell is **objects**. Configure the prompt first so Tab / history feel like zsh; then `?` and `Get-Member` make sense — see [PowerShell scripting](./powershell-scripting.md).

## Make it feel like zsh (PSReadLine)

Run once in the Evil-WinRM / `powershell.exe` session. Survives for this process only unless you put it in a profile.

```powershell
Import-Module PSReadLine -ErrorAction SilentlyContinue

# Tab opens a visual menu (Fish/zsh-style) instead of cycling one match
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete

# Up/Down search history by the prefix you already typed (bash Ctrl+R-ish)
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

# Ghost-text of the last matching command as you type
Set-PSReadLineOption -PredictionSource History
```

`PredictionSource` needs a recent PSReadLine (Windows 10/11 / pwsh). Windows PowerShell 5.1 still gets Tab menu + history search. If `Set-PSReadLineOption` errors, skip that line.

## Cursor and editing

- `Home` / `Ctrl+A` — start of line
- `End` / `Ctrl+E` — end of line
- `Ctrl+Left` / `Ctrl+Right` — jump word
- `Ctrl+Backspace` / `Ctrl+Delete` — delete word
- `Ctrl+L` — clear screen (`Clear-Host`)
- `Esc` — wipe the current line
- `Ctrl+C` — cancel the current line / running command
- `Tab` — complete token; after the PSReadLine block above, Tab is the visual menu
- `Ctrl+Space` — menu complete (pick from a list). Useful after `sv | ? {$_.`
- `Ctrl+R` — reverse history search
- `Up` / `Down` — previous / next history; after the block above, prefix search

Copy/paste depends on the host:

- **Windows Terminal / conhost**: `Ctrl+Shift+C` / `Ctrl+Shift+V`, or mark mode (`Ctrl+M` then arrows, `Enter` to copy).
- **PSReadLine 2.x** often maps `Ctrl+C`/`Ctrl+V` when nothing is running.
- Right-click paste still works in old `powershell.exe`.

See current bindings:

```powershell
Get-PSReadLineKeyHandler
```

## Completion for pipelines / Ctrl+Space

`Ctrl+Space` is IntelliSense. After a cmdlet or a `.` it pops parameters or properties.

```powershell
Get-Service -          # then Ctrl+Space → every parameter
$a = Get-Service; $a.  # then Ctrl+Space → Name, Status, DisplayName

sv | ? {$_.
```

Type the property and `Tab` or `Ctrl+Space`. With the Tab handler above, Tab is the same menu.

List members when you do not want the popup (the actual way to learn an object):

```powershell
gsv | gm
Get-Service | Get-Member
```

`gm` is the substitute for "just cat the output" — see [PowerShell scripting](./powershell-scripting.md).

## Help (`?` / man)

```powershell
# Synopsis only
Get-Help Get-Service
Get-Service -?

# Full page (examples)
Get-Help Get-Service -Full
Get-Help Get-Service -Examples
Get-Help Get-Service -Parameter Status
Get-Help Get-Service -Online   # opens Microsoft docs in a browser

# Discover commands
Get-Command *smb*
Get-Command -Noun Service
Get-Alias gsv
```

`man` and `help` are aliases for `Get-Help`. `-?` after a cmdlet is the same as synopsis help.

### man pages on Linux (pwsh)

Install PowerShell, then the same cmdlets work. There is no separate `man get-service(1)` in `/usr/share/man` unless you generate it.

```bash
# Debian/Ubuntu
sudo apt install powershell   # or Microsoft's pwsh package
pwsh
Get-Help Get-Service -Full
```

Update the local help cache (needs network):

```powershell
Update-Help -Force -ErrorAction SilentlyContinue
```

On an air-gapped Windows box, skip `-Online` and use `-Examples`.

## Jobs (background)

PowerShell jobs are not bash `Ctrl+Z`.

```powershell
Start-Job -ScriptBlock { Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue }
Get-Job
Receive-Job -Id 1 -Keep
Stop-Job -Id 1; Remove-Job -Id 1

# Run something in this session without blocking the prompt
Start-Process notepad
Get-Process notepad | Stop-Process
```

`Ctrl+C` kills the foreground pipeline. Use `Start-Job` / `Start-Process` to background.

## Resources

- [PSReadLine key bindings](https://learn.microsoft.com/en-us/powershell/module/psreadline/about/about_psreadline) — about_PSReadLine
- [Get-Help](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help) — help cmdlet
- [PowerShell enumeration](./powershell-enumeration.md) — host/user/share enum
- [PowerShell scripting](./powershell-scripting.md) — aliases (`gsv`, `?`, `%`)
- [Windows Run menu](./run-menu.md) — GUI snap-ins vs cmdlets
- [Enable RDP / WinRM](../../infiltration/windows/enable-rdp-winrm.md) — front-door session from a foothold
