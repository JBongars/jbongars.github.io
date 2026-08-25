# mysql

**Author:** Julien Bongars\
**Date:** 2026-01-30 18:28:06
**Path:**

---

## cheat.sh

```bash
---
tags: [ database ]
---
# To connect to a database:
mysql -h <host> -u <username> -p

# To backup all databases:
mysqldump --all-databases --all-routines -u <username> -p > ~/dump.sql

# To restore all databases:
mysql -u <username> -p  < ~/fulldump.sql

# To create a database in utf8 charset:
CREATE DATABASE owa CHARACTER SET utf8 COLLATE utf8_general_ci;

# To add a user and give rights on the given database:
GRANT ALL PRIVILEGES ON database.* TO 'user'@'localhost'IDENTIFIED BY 'password' WITH GRANT OPTION;

# To list the privileges granted to the account that you are using to connect to the server. Any of the 3 statements will work. :
SHOW GRANTS FOR CURRENT_USER();
SHOW GRANTS;
SHOW GRANTS FOR CURRENT_USER;

# Basic SELECT Statement:
SELECT * FROM tbl_name;

# Basic INSERT Statement:
INSERT INTO tbl_name (col1,col2) VALUES(15,col1*2);

# Basic UPDATE Statement:
UPDATE tbl_name SET col1 = "example";

# Basic DELETE Statement:
DELETE FROM tbl_name WHERE user = 'jcole';

# To check stored procedure:
SHOW PROCEDURE STATUS;

# To check stored function:
SHOW FUNCTION STATUS;

 tldr:mysql 
# mysql
# The MySQL command-line tool.
# More information: <https://www.mysql.com/>.

# Connect to a database:
mysql database_name

# Connect to a database, user will be prompted for a password:
mysql -u user --password database_name

# Connect to a database on another host:
mysql -h database_host database_name

# Connect to a database through a Unix socket:
mysql --socket path/to/socket.sock

# Execute SQL statements in a script file (batch file):
mysql -e "source filename.sql" database_name

# Restore a database from a backup created with `mysqldump` (user will be prompted for a password):
mysql --user user --password database_name < path/to/backup.sql

# Restore all databases from a backup (user will be prompted for a password):
mysql --user user --password < path/to/backup.sql
```

## Show all Tables

```bash
SHOW DATABASE;

SHOW TABLES;

DESCRIBE TABLES; -- this is also really useful
```
