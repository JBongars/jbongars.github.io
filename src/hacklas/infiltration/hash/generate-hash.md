# Hash Generation & Enumeration

**Author:** Julien Bongars\
**Date:** 2025-09-26 13:34:26
**Path:**

---

## Hash Format Identification

| hash      | description   |
| --------- | ------------- |
| $1$       | MD5 crypt     |
| $5$       | SHA-256 crypt |
| $y$       | yescrypt      |
| $2a$/$2b$ | bcrypt        |
| $6$       | SHA-512 crypt |
| $argon2i$ | Argon2        |

**Structure:** `$6$salt$hash` (algorithm + salt + hashed password)

## Generation Commands

### OpenSSL

```bash
# SHA-512 with random salt
openssl passwd -6 -salt $(openssl rand -base64 16) password123
```

### mkpasswd

```bash
mkpasswd -m sha-512 password123
mkpasswd -m sha-256 password123
mkpasswd -m bcrypt password123
```

### Python

```python
import crypt
salt = crypt.mksalt(crypt.METHOD_SHA512)
hashed = crypt.crypt("password123", salt)
```

## Hash Analysis

### Identify Type

```bash
hashid '$6$Ry6Vdbse$8enMR5Znxoo...'
echo -n 'hash' | wc -c  # Check length
```

## Application Hashes

```bash
# MySQL old format
mysql -e "SELECT PASSWORD('password123');"

# WordPress
python3 -c "import hashlib,base64,os; s=base64.b64encode(os.urandom(6)).decode(); print(f'\$P\$B{s}{hashlib.md5((\"password123\"+s).encode()).hexdigest()}')"

# Laravel bcrypt
php -r "echo password_hash('password123', PASSWORD_BCRYPT);"
```

## Hash Validation

```bash
# Test password against hash
python3 -c "import crypt; print(crypt.crypt('password123', '\$6\$stored_hash') == '\$6\$stored_hash')"

# Extract salt and test
salt=$(echo '$6$Ry6Vdbse$hash...' | cut -d'$' -f1-3)
python3 -c "import crypt; print(crypt.crypt('password123', '$salt'))"

# Verify with openssl (extract salt first)
echo 'password123' | openssl passwd -6 -stdin -salt extracted_salt
```
