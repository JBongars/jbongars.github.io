# LDAP Enumeration

**Author:** Julien Bongars\
**Date:** 2025-09-24 23:55:48\
**Path:** `notes/enumeration/ldap.md`

---

## Overview

Lightweight Directory Access Protocol - typically runs on ports 389 (LDAP) and 636 (LDAPS)

## Port Discovery

```bash
# Scan for LDAP ports
nmap -p 389,636,1389 target-ip

# Monitor LDAP connections
sudo tcpdump port 389 or port 636 or port 1389

# Check if port is open
nc -nv target-ip 389
telnet target-ip 389
```

## Basic Enumeration

```bash
# Anonymous bind attempt
ldapsearch -x -H ldap://target-ip -s base

# Get naming contexts
ldapsearch -x -H ldap://target-ip -s base namingcontexts

# Enumerate base DN
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com"

# Find all users
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com" "(objectclass=person)"

# Find all groups
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com" "(objectclass=group)"
```

## Authentication Testing

```bash
# Test credentials
ldapsearch -x -D "cn=admin,dc=company,dc=com" -W -H ldap://target-ip

# Brute force users
ldapsearch -x -D "cn=username,dc=company,dc=com" -w password -H ldap://target-ip
```

## Information Gathering

```bash
# Dump all attributes
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com" "*" "+"

# Get user details
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com" "cn=john*"

# Find admin accounts
ldapsearch -x -H ldap://target-ip -b "dc=company,dc=com" "(adminCount=1)"
```

## Tools

```bash
# ldapenum
python ldapenum.py target-ip

# AD enumeration
enum4linux target-ip
```

## Common LDAP Implementations

- **Active Directory** (389, 636, 3268, 3269)
- **OpenLDAP** (389, 636)
- **Apache Directory Server** (10389)

## Quick Checks

```bash
# Check if anonymous access allowed
ldapsearch -x -H ldap://target-ip -s base > /dev/null && echo "Anonymous bind allowed"

# Check LDAPS
openssl s_client -connect target-ip:636
```
