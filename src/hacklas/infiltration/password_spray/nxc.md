# NXC SSH Password Spray

**Author:** Julien Bongars\
**Date:** 2026-01-31 05:02:11
**Path:**

---

## Basic Syntax

```bash
nxc ssh <target> -u <users> -p <passwords>
```

### Why NXC Over SSH

Multiple targets - Spray entire subnets in one command
Credential combos - Auto-tests all user/pass combinations
Clean output - Shows [+] success / [-] failure, easy to parse
No interactive session - Just tests and reports, no shell
Multi-protocol - Same syntax for SMB, WinRM, LDAP, RDP
Built-in features - Continue on success, paired mode, timing options

## Examples

```bash
# Single user, single password:
nxc ssh 192.168.1.10 -u admin -p password123

# Multiple users from file, single password:
nxc ssh 192.168.1.10 -u users.txt -p 'Summer2024!'

# Multiple users, multiple passwords:
nxc ssh 192.168.1.10 -u users.txt -p passwords.txt

# Subnet spray:
nxc ssh 192.168.1.0/24 -u users.txt -p passwords.txt
```

## Useful Flags

| Flag                    | Description                           |
| ----------------------- | ------------------------------------- |
| `--continue-on-success` | Don't stop after valid cred           |
| `--no-bruteforce`       | Try user1:pass1, user2:pass2 (paired) |
| `--port 2222`           | Custom SSH port                       |

## Pair Mode vs Spray Mode

**Default (spray):** Tries every password for every user

**Paired (`--no-bruteforce`):** Tries line-by-line matching

```bash
nxc ssh 192.168.1.10 -u users.txt -p passwords.txt --no-bruteforce
```

## Cheat.sh

```bash
# nxc
# Network service enumeration and exploitation tool.
# Some subcommands such as `smb` have their own usage documentation.
# More information: <https://www.netexec.wiki/>.

# [L]ist available modules for the specified protocol:
nxc smb|ssh|ldap|ftp|wmi|winrm|rdp|vnc|mssql -L

# List the options available for the specified module:
nxc smb|ssh|ldap|ftp|wmi|winrm|rdp|vnc|mssql -M module_name --options

# Specify an option for a module:
nxc smb|ssh|ldap|ftp|wmi|winrm|rdp|vnc|mssql -M module_name -o OPTION_NAME=option_value

# View the options available for the specified protocol:
nxc smb|ssh|ldap|ftp|wmi|winrm|rdp|vnc|mssql --help
```
