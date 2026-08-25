# sqlite

**Author:** Julien Bongars\
**Date:** 2026-02-02 22:48:18
**Path:**

---

## Open a connection

```bash
sqlite3 gitea.db
```

## Useful Commands

```sql
-- List all tables
.tables

-- Show schema for a table
.schema table_name

-- Run a query
SELECT * FROM users;

-- Show column headers
.headers on

-- Better output formatting
.mode column

-- Exit
.quit
```

## Cheat.sh

```bash
# To create database and launch interactive shell:
sqlite3 <database>

# To create table:
sqlite3 <database> "create table os(id integer primary key, name text, year integer);"

# To insert data:
sqlite3 <database> "insert into 'os' values(1,'linux',1991);"

# To list tables:
sqlite3 <database> ".tables"

# To describe table:
sqlite3 <database> ".schema 'os'"

# To view records in table:
sqlite3 <database> "select * from 'os';"

# To view records in table conditionally:
sqlite3 <database> "select * from 'os' where year='1991';"

# To view records with fuzzy matching:
sqlite3 <database> "select * from 'os' where year like '19%';"

# To create a table named `cities` and import a csv into it:
sqlite3 <database> ".import /path/to/city.csv cities"

 tldr:sqlite3 
# sqlite3
# The command-line interface to SQLite 3, which is a self-contained file-based embedded SQL engine.
# More information: <https://sqlite.org>.

# Start an interactive shell with a new database:
sqlite3

# Open an interactive shell against an existing database:
sqlite3 path/to/database.sqlite3

# Execute an SQL statement against a database and then exit:
sqlite3 path/to/database.sqlite3 'SELECT * FROM some_table;'
```
