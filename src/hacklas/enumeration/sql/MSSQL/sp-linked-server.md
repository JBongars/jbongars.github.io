# Enumeration

## 1. Check if linked servers exist:

```sql
-- List all linked servers
EXEC sp_linkedservers;

-- Alternative method
SELECT * FROM sys.servers;
SELECT * FROM sys.servers WHERE is_linked = 1;
```

### Looking for

Source: `SELECT * FROM sys.servers;`

| Property                | Value      | Status                          |
| ----------------------- | ---------- | ------------------------------- |
| server_id               | 0          | Local server entry              |
| name                    | DC01       | Server name                     |
| is_linked               | 0          | Not marked as linked (loopback) |
| is_remote_login_enabled | 1          | Remote login allowed            |
| is_rpc_out_enabled      | 1          | Can execute remote procedures   |
| is_data_access_enabled  | 0          | Blocking OPENQUERY              |
| product                 | SQL Server | Server type                     |
| provider                | SQLNCLI    | Connection provider             |
| data_source             | DC01       | Target server                   |

## 2. Check linked server configuration:

```sql
-- Detailed config for each linked server
EXEC sp_helpserver;
EXEC sp_helpserver 'DC01';

-- Check what options are enabled
SELECT 
    name,
    product,
    provider,
    data_source,
    is_linked,
    is_remote_login_enabled,
    is_rpc_out_enabled,
    is_data_access_enabled
FROM sys.servers;
```

## 3. Check authentication/login mappings:

```sql
-- How does the linked server authenticate?
EXEC sp_helplinkedsrvlogin;
EXEC sp_helplinkedsrvlogin 'DC01';

-- Detailed login mapping info
SELECT * FROM sys.linked_logins;
4. Test what user context it runs as:
sql-- Try to see what user the linked server uses
SELECT * FROM [DC01].master.sys.database_principals;

-- Four-part naming (doesn't need data access enabled)
SELECT * FROM [DC01].master.dbo.sysobjects WHERE type = 'P';
```
